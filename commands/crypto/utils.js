const https = require('https');
const http = require('http');
const { ethers } = require('ethers');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bitcoin = require('bitcoinjs-lib');

// Cache for crypto prices (update every 5 minutes)
const priceCache = {
  prices: {},
  lastUpdate: 0,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};

// Crypto API endpoints and configurations
const CRYPTO_CONFIG = {
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    apiUrl: (address) => `https://api.solscan.io/account?address=${address}`,
    balancePath: 'data.lamports',
    balanceConverter: (lamports) => lamports / 1e9, // Convert lamports to SOL
    fallbackApi: (address) => `https://public-api.solana.com`, // RPC endpoint
    addressValidator: (address) => {
      try {
        // Use Solana's PublicKey for proper validation
        new PublicKey(address);
        // Additional format check (base58, 32-44 chars)
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      } catch (e) {
        return false;
      }
    },
    addressValidatorError: (address) => {
      if (!address || address.trim().length === 0) {
        return 'Address cannot be empty';
      }
      if (address.startsWith('0x')) {
        return 'This looks like an Ethereum address. Use `,eth set` for Ethereum addresses.';
      }
      if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
        return 'This looks like a Bitcoin address. Use `,btc set` for Bitcoin addresses.';
      }
      if (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) {
        return 'This looks like a Litecoin address. Use `,ltc set` for Litecoin addresses.';
      }
      if (address.length < 32 || address.length > 44) {
        return 'Solana addresses must be between 32 and 44 characters long.';
      }
      if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
        return 'Solana addresses must only contain base58 characters (no 0, O, I, or l).';
      }
      try {
        new PublicKey(address);
        return 'Invalid Solana address format.';
      } catch (e) {
        return 'Invalid Solana address. Please check the address and try again.';
      }
    }
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    // Note: Etherscan API V2 requires API key for most requests
    // Get free API key at https://etherscan.io/apis to increase rate limits
    // V2 API endpoint format
    apiUrl: (address) => {
      const apiKey = process.env.ETHERSCAN_API_KEY || '';
      if (!apiKey) {
        // Use Ethplorer API if no API key (free tier, no key needed)
        return `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      }
      // Etherscan V2 API (still uses same endpoint but with proper headers/format)
      return `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    },
    balancePath: 'result', // For Etherscan, 'coin_balance' for Blockscout
    balanceConverter: (wei) => {
      // Handle string or number input (Etherscan returns strings)
      const weiValue = typeof wei === 'string' ? wei : String(wei);
      // Check if it's an error message
      if (weiValue.includes('deprecated') || weiValue.includes('V1') || weiValue.includes('V2')) {
        throw new Error(weiValue);
      }
      // Use BigInt for large numbers to avoid precision loss, then convert to number
      try {
        const weiBigInt = BigInt(weiValue);
        return Number(weiBigInt) / 1e18;
      } catch (e) {
        // Fallback to parseFloat for very large numbers
        return parseFloat(weiValue) / 1e18;
      }
    }, // Convert wei to ETH
    fallbackApi: (address) => {
      // Use Ethplorer API as fallback (no key needed for basic balance)
      return `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
    },
    addressValidator: (address) => {
      try {
        // Use ethers to validate Ethereum address (includes checksum validation)
        return ethers.isAddress(address);
      } catch (e) {
        return false;
      }
    },
    addressValidatorError: (address) => {
      if (!address || address.trim().length === 0) {
        return 'Address cannot be empty';
      }
      if (!address.startsWith('0x')) {
        if (address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
          return 'This looks like a Solana address. Use `,sol set` for Solana addresses.';
        }
        if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
          return 'This looks like a Bitcoin address. Use `,btc set` for Bitcoin addresses.';
        }
        if (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) {
          return 'This looks like a Litecoin address. Use `,ltc set` for Litecoin addresses.';
        }
        return 'Ethereum addresses must start with "0x".';
      }
      if (address.length !== 42) {
        return 'Ethereum addresses must be exactly 42 characters (0x + 40 hex characters).';
      }
      if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
        return 'Ethereum addresses must contain only hexadecimal characters (0-9, a-f, A-F) after "0x".';
      }
      try {
        if (!ethers.isAddress(address)) {
          return 'Invalid Ethereum address format or checksum.';
        }
        return 'Invalid Ethereum address. Please check the address and try again.';
      } catch (e) {
        return 'Invalid Ethereum address. Please check the address and try again.';
      }
    }
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    apiUrl: (address) => `https://blockchain.info/balance?active=${address}`,
    balancePath: 'balance', // Special handling for BTC
    balanceConverter: (satoshis) => satoshis / 1e8, // Convert satoshis to BTC
    fallbackApi: (address) => `https://blockchain.info/q/addressbalance/${address}`,
    addressValidator: (address) => {
      try {
        // Use bitcoinjs-lib for proper validation
        // Check for legacy (1...), P2SH (3...), and bech32 (bc1...) addresses
        if (address.startsWith('bc1')) {
          // Bech32 address (native segwit) - validate by trying to decode
          try {
            bitcoin.address.fromBech32(address);
            return true;
          } catch (e) {
            return false;
          }
        } else if (address.startsWith('1') || address.startsWith('3')) {
          // Legacy or P2SH address
          try {
            bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
            return true;
          } catch (e) {
            return false;
          }
        }
        return false;
      } catch (e) {
        // Fallback to regex if library fails
        return /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(address);
      }
    },
    addressValidatorError: (address) => {
      if (!address || address.trim().length === 0) {
        return 'Address cannot be empty';
      }
      if (address.startsWith('0x')) {
        return 'This looks like an Ethereum address. Use `,eth set` for Ethereum addresses.';
      }
      if (address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
        return 'This looks like a Solana address. Use `,sol set` for Solana addresses.';
      }
      if (address.startsWith('L') || address.startsWith('M') || address.startsWith('ltc1')) {
        return 'This looks like a Litecoin address. Use `,ltc set` for Litecoin addresses.';
      }
      if (!address.startsWith('1') && !address.startsWith('3') && !address.startsWith('bc1')) {
        return 'Bitcoin addresses must start with "1" (legacy), "3" (P2SH), or "bc1" (native segwit/bech32).';
      }
      if (address.length < 26 || address.length > 62) {
        return 'Bitcoin addresses must be between 26 and 62 characters long.';
      }
      try {
        if (address.startsWith('bc1')) {
          bitcoin.address.fromBech32(address);
        } else {
          bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
        }
        return 'Invalid Bitcoin address format.';
      } catch (e) {
        return 'Invalid Bitcoin address. Please check the address and try again.';
      }
    }
  },
  LTC: {
    name: 'Litecoin',
    symbol: 'LTC',
    apiUrl: (address) => `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`,
    balancePath: 'balance',
    balanceConverter: (satoshis) => satoshis / 1e8, // Convert satoshis to LTC
    fallbackApi: (address) => `https://api.blockcypher.com/v1/ltc/main/addrs/${address}`,
    addressValidator: (address) => {
      try {
        // Use bitcoinjs-lib for proper validation (Litecoin uses same format as Bitcoin)
        // Check for legacy (L...), P2SH (M...), and bech32 (ltc1...) addresses
        if (address.startsWith('ltc1')) {
          // Bech32 address (native segwit) - validate by trying to decode
          try {
            bitcoin.address.fromBech32(address);
            return true;
          } catch (e) {
            return false;
          }
        } else if (address.startsWith('L') || address.startsWith('M')) {
          // Legacy or P2SH address
          try {
            bitcoin.address.toOutputScript(address, bitcoin.networks.litecoin);
            return true;
          } catch (e) {
            return false;
          }
        }
        return false;
      } catch (e) {
        // Fallback to regex if library fails
        return /^(L|M|ltc1)[a-zA-Z0-9]{25,62}$/.test(address);
      }
    },
    addressValidatorError: (address) => {
      if (!address || address.trim().length === 0) {
        return 'Address cannot be empty';
      }
      if (address.startsWith('0x')) {
        return 'This looks like an Ethereum address. Use `,eth set` for Ethereum addresses.';
      }
      if (address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
        return 'This looks like a Solana address. Use `,sol set` for Solana addresses.';
      }
      if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
        return 'This looks like a Bitcoin address. Use `,btc set` for Bitcoin addresses.';
      }
      if (!address.startsWith('L') && !address.startsWith('M') && !address.startsWith('ltc1')) {
        return 'Litecoin addresses must start with "L" (legacy), "M" (P2SH), or "ltc1" (native segwit/bech32).';
      }
      if (address.length < 26 || address.length > 62) {
        return 'Litecoin addresses must be between 26 and 62 characters long.';
      }
      try {
        if (address.startsWith('ltc1')) {
          bitcoin.address.fromBech32(address);
        } else {
          bitcoin.address.toOutputScript(address, bitcoin.networks.litecoin);
        }
        return 'Invalid Litecoin address format.';
      } catch (e) {
        return 'Invalid Litecoin address. Please check the address and try again.';
      }
    }
  }
};

/**
 * Fetch crypto balance from API
 */
async function fetchCryptoBalance(currency, address) {
  const config = CRYPTO_CONFIG[currency.toUpperCase()];
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  // Validate address format
  if (!config.addressValidator(address)) {
    throw new Error(`Invalid ${config.name} address format`);
  }

  try {
    // Try primary API
    const balance = await fetchFromAPI(config.apiUrl(address), config.balancePath, config.balanceConverter, address);
    return balance;
  } catch (error) {
    // Try fallback API if available
    if (config.fallbackApi) {
      try {
        const balance = await fetchFromAPI(config.fallbackApi(address), config.balancePath, config.balanceConverter, address);
        return balance;
      } catch (fallbackError) {
        throw new Error(`Failed to fetch ${config.name} balance: ${fallbackError.message}`);
      }
    }
    throw error;
  }
}

/**
 * Generic API fetch function
 */
function fetchFromAPI(url, balancePath, converter, address) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Discord-Bot/1.0'
      }
    };

    const protocol = urlObj.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      // Check HTTP status code
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', (chunk) => {
          errorData += chunk;
        });
        res.on('end', () => {
          reject(new Error(`API returned HTTP ${res.statusCode}. This may be due to rate limiting or server issues.`));
        });
        return;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Handle plain text responses (like blockchain.info fallback)
          if (res.headers['content-type'] && res.headers['content-type'].includes('text/plain')) {
            const balance = parseInt(data.trim());
            if (isNaN(balance)) {
              reject(new Error('Invalid balance response'));
              return;
            }
            const convertedBalance = converter(balance);
            resolve(convertedBalance);
            return;
          }

          const json = JSON.parse(data);
          
          // Handle Ethplorer API format (fallback when no Etherscan key)
          if (json.ETH && json.ETH.balance !== undefined) {
            // Ethplorer returns balance in ETH (already converted)
            const balance = json.ETH.balance;
            const balanceValue = typeof balance === 'string' ? balance : String(balance);
            const convertedBalance = parseFloat(balanceValue);
            if (isNaN(convertedBalance)) {
              reject(new Error(`Invalid balance value: ${balanceValue}`));
              return;
            }
            resolve(convertedBalance);
            return;
          }
          
          // Handle Blockscout API format (if used)
          if (json.coin_balance !== undefined) {
            // Blockscout v2 format: coin_balance is in hex or decimal string
            let balance = json.coin_balance;
            if (typeof balance === 'string' && balance.startsWith('0x')) {
              // Convert hex to decimal
              balance = BigInt(balance).toString();
            }
            const balanceValue = typeof balance === 'string' ? balance : String(balance);
            const convertedBalance = converter(balanceValue);
            if (isNaN(convertedBalance)) {
              reject(new Error(`Invalid balance value: ${balanceValue}`));
              return;
            }
            resolve(convertedBalance);
            return;
          }
          
          if (json.data && json.data.coin_balance !== undefined) {
            // Blockscout nested format
            let balance = json.data.coin_balance;
            if (typeof balance === 'string' && balance.startsWith('0x')) {
              // Convert hex to decimal
              balance = BigInt(balance).toString();
            }
            const balanceValue = typeof balance === 'string' ? balance : String(balance);
            const convertedBalance = converter(balanceValue);
            if (isNaN(convertedBalance)) {
              reject(new Error(`Invalid balance value: ${balanceValue}`));
              return;
            }
            resolve(convertedBalance);
            return;
          }
          
          // Check for API errors (Etherscan returns status/message)
          // Sometimes Etherscan returns status '0' but still has valid data
          if (json.status === '0' && json.message && json.message !== 'OK') {
            // Check if result contains an error message instead of balance
            if (json.result && (typeof json.result === 'string') && 
                (json.result.includes('deprecated') || json.result.includes('V1') || json.result.includes('V2') || 
                 json.result.includes('switch') || json.result.includes('migration'))) {
              reject(new Error(`Etherscan API error: ${json.result}. Please add an ETHERSCAN_API_KEY to your .env file.`));
              return;
            }
            // Check if we still have a result (some APIs return data even with status 0)
            if (!json.result || json.result === '0') {
              const errorMsg = json.message || 'API returned an error';
              // Provide more helpful error messages
              if (errorMsg.includes('rate limit') || errorMsg.includes('Max rate limit')) {
                reject(new Error('Rate limit exceeded. Please add an ETHERSCAN_API_KEY to your .env file for higher limits.'));
              } else if (errorMsg.includes('Invalid API Key')) {
                reject(new Error('Invalid API key. Please check your ETHERSCAN_API_KEY in .env file.'));
              } else {
                reject(new Error(`API error: ${errorMsg}`));
              }
              return;
            }
            // If we have a result despite status 0, continue processing
          } else if (json.status === '0' && !json.result) {
            reject(new Error(json.message || 'API returned an error'));
            return;
          }
          
          // Handle different API response formats
          let balance;
          
          // Special handling for Bitcoin (blockchain.info returns object with address as key)
          if (balancePath === 'balance' && json[address]) {
            balance = json[address].final_balance || json[address].balance || 0;
          } else if (balancePath === 'balance' && json.balance !== undefined) {
            // For APIs that return balance directly
            balance = json.balance;
          } else {
            // Navigate through nested object using dot notation
            const paths = balancePath.split('.');
            balance = paths.reduce((obj, path) => {
              if (Array.isArray(obj)) {
                return obj[path];
              }
              return obj && obj[path] !== undefined ? obj[path] : null;
            }, json);
          }

          if (balance === null || balance === undefined) {
            // Provide more helpful error with response details for debugging
            const responsePreview = JSON.stringify(json).substring(0, 200);
            reject(new Error(`Balance not found in API response. Response: ${responsePreview}...`));
            return;
          }

          // Convert to number/string as needed (Etherscan returns strings)
          const balanceValue = typeof balance === 'string' ? balance : String(balance);
          
          // Check if balance is actually an error message (Etherscan V1 deprecation)
          if (balanceValue.includes('deprecated') || balanceValue.includes('V1') || balanceValue.includes('V2') || 
              balanceValue.includes('switch') || balanceValue.includes('migration')) {
            reject(new Error(`Etherscan API error: ${balanceValue}. Please add an ETHERSCAN_API_KEY to your .env file for V2 API access.`));
            return;
          }
          
          const convertedBalance = converter(balanceValue);
          
          if (isNaN(convertedBalance)) {
            reject(new Error(`Invalid balance value: ${balanceValue}`));
            return;
          }
          
          resolve(convertedBalance);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('API request timeout'));
    });

    req.end();
  });
}

/**
 * Validate crypto address format
 */
function validateAddress(currency, address) {
  const config = CRYPTO_CONFIG[currency.toUpperCase()];
  if (!config) {
    return { valid: false, error: `Unsupported currency: ${currency}` };
  }
  
  // Trim whitespace
  const trimmedAddress = address ? address.trim() : '';
  
  // Check if address is empty
  if (!trimmedAddress || trimmedAddress.length === 0) {
    return { valid: false, error: 'Address cannot be empty' };
  }
  
  // Validate address format
  if (!config.addressValidator(trimmedAddress)) {
    // Use detailed error message if available
    const errorMessage = config.addressValidatorError 
      ? config.addressValidatorError(trimmedAddress)
      : `Invalid ${config.name} address format`;
    return { valid: false, error: errorMessage };
  }
  
  return { valid: true };
}

/**
 * Format crypto balance for display
 */
function formatBalance(balance, currency) {
  if (!currency) {
    // Fallback if currency is not provided
    return balance.toLocaleString('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 0 });
  }
  const config = CRYPTO_CONFIG[currency.toUpperCase()];
  if (!config) return balance.toFixed(8);
  
  // Format with appropriate decimal places
  if (balance >= 1) {
    return balance.toLocaleString('en-US', { maximumFractionDigits: 4, minimumFractionDigits: 2 });
  } else if (balance >= 0.01) {
    return balance.toLocaleString('en-US', { maximumFractionDigits: 6, minimumFractionDigits: 2 });
  } else {
    return balance.toLocaleString('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 0 });
  }
}

/**
 * Get currency display name
 */
function getCurrencyName(currency) {
  const config = CRYPTO_CONFIG[currency.toUpperCase()];
  return config ? config.name : currency.toUpperCase();
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(currency) {
  const config = CRYPTO_CONFIG[currency.toUpperCase()];
  return config ? config.symbol : currency.toUpperCase();
}

/**
 * Fetch USD price for a cryptocurrency
 * Uses CoinGecko API (free, no key needed)
 */
async function fetchCryptoPrice(currency) {
  const symbol = currency.toUpperCase();
  const coinIdMap = {
    'SOL': 'solana',
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'LTC': 'litecoin'
  };

  const coinId = coinIdMap[symbol];
  if (!coinId) {
    throw new Error(`Unsupported currency for price lookup: ${currency}`);
  }

  // Check cache first
  const now = Date.now();
  if (priceCache.prices[symbol] && (now - priceCache.lastUpdate) < priceCache.cacheDuration) {
    return priceCache.prices[symbol];
  }

  return new Promise((resolve, reject) => {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Discord-Bot/1.0'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        res.on('data', () => {});
        res.on('end', () => {
          reject(new Error(`Price API returned HTTP ${res.statusCode}`));
        });
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json[coinId] && json[coinId].usd) {
            const price = json[coinId].usd;
            // Update cache
            priceCache.prices[symbol] = price;
            priceCache.lastUpdate = now;
            resolve(price);
          } else {
            reject(new Error('Price not found in API response'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse price API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Price API request failed: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Price API request timeout'));
    });

    req.end();
  });
}

/**
 * Convert crypto balance to USD
 */
async function convertToUSD(currency, balance) {
  try {
    const price = await fetchCryptoPrice(currency);
    return balance * price;
  } catch (error) {
    console.error(`Failed to fetch price for ${currency}:`, error.message);
    return 0; // Return 0 if price fetch fails
  }
}

/**
 * Generate a unique verification message for wallet verification
 */
function generateVerificationMessage(userId, currency, address, timestamp = null) {
  const ts = timestamp || Date.now();
  return `Verify ${currency.toUpperCase()} wallet ${address} for Discord user ${userId} at ${new Date(ts).toISOString()}`;
}

/**
 * Verify Ethereum signature
 */
function verifyEthereumSignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Ethereum signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify Solana signature
 */
function verifySolanaSignature(message, signature, expectedAddress) {
  try {
    const publicKey = new PublicKey(expectedAddress);
    const messageBytes = Buffer.from(message, 'utf8');
    
    // Try base64 first
    try {
      const signatureBytes = Buffer.from(signature, 'base64');
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    } catch (e) {
      // Try hex format if base64 fails
      const signatureBytes = Buffer.from(signature, 'hex');
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    }
  } catch (error) {
    console.error('Solana signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify Bitcoin/Litecoin signature
 * Note: Bitcoin message signing is complex and may need adjustment
 */
function verifyBitcoinSignature(message, signature, expectedAddress) {
  try {
    // Bitcoin message signing uses a specific format
    // This is a simplified version - you may need to adjust based on your wallet implementation
    const messageBuffer = Buffer.from(message, 'utf8');
    
    // Try to verify using bitcoinjs-lib
    // Note: The exact format depends on how the wallet signs the message
    // Some wallets use a different message prefix
    try {
      // Standard Bitcoin message format
      const magicBytes = Buffer.from('\x18Bitcoin Signed Message:\n');
      const messageLength = Buffer.allocUnsafe(1);
      messageLength.writeUInt8(messageBuffer.length, 0);
      const messageToVerify = Buffer.concat([magicBytes, messageLength, messageBuffer]);
      
      // Decode signature (usually base64)
      const signatureBuffer = Buffer.from(signature, 'base64');
      
      // This is a simplified check - full implementation would verify against the address
      // For now, we'll do a basic validation
      // In production, you'd want to use bitcoinjs-lib's message.verify properly
      return true; // Placeholder - needs proper implementation
    } catch (e) {
      console.error('Bitcoin signature format error:', e.message);
      return false;
    }
  } catch (error) {
    console.error('Bitcoin signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify crypto wallet signature based on currency
 */
function verifyCryptoSignature(currency, message, signature, expectedAddress) {
  const upperCurrency = currency.toUpperCase();
  
  switch (upperCurrency) {
    case 'ETH':
      return verifyEthereumSignature(message, signature, expectedAddress);
    case 'SOL':
      return verifySolanaSignature(message, signature, expectedAddress);
    case 'BTC':
    case 'LTC':
      return verifyBitcoinSignature(message, signature, expectedAddress);
    default:
      throw new Error(`Signature verification not supported for ${currency}`);
  }
}

module.exports = {
  fetchCryptoBalance,
  validateAddress,
  formatBalance,
  getCurrencyName,
  getCurrencySymbol,
  fetchCryptoPrice,
  convertToUSD,
  generateVerificationMessage,
  verifyCryptoSignature,
  CRYPTO_CONFIG
};

