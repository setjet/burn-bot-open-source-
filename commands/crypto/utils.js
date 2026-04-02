const https = require('https');
const http = require('http');
const config = require('../../config');

// this file is why i have trust issues with third-party apis 😭 (etherscan vs ethplorer dance took forever)

const priceCache = {
  prices: {},
  lastUpdate: 0,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};

const CRYPTO_CONFIG = {
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    apiUrl: (address) => `https://api.mainnet-beta.solana.com`,
    balancePath: null,
    balanceConverter: (lamports) => lamports / 1e9,
    fallbackApi: (address) => `https://api.solscan.io/account?address=${address}`
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    apiUrl: (address) => {
      const apiKey = config.etherscanApiKey || '';
      if (!apiKey) {
        return `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      }
      return `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    },
    balancePath: 'result',
    balanceConverter: (wei) => {
      const weiValue = typeof wei === 'string' ? wei : String(wei);
      if (weiValue.includes('deprecated') || weiValue.includes('V1') || weiValue.includes('V2')) {
        throw new Error(weiValue);
      }
      try {
        const weiBigInt = BigInt(weiValue);
        return Number(weiBigInt) / 1e18;
      } catch (e) {
        return parseFloat(weiValue) / 1e18;
      }
    },
    fallbackApi: (address) => {
      return `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
    }
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    apiUrl: (address) => `https://blockchain.info/balance?active=${address}`,
    balancePath: 'balance',
    balanceConverter: (satoshis) => satoshis / 1e8,
    fallbackApi: (address) => `https://blockchain.info/q/addressbalance/${address}`
  },
  LTC: {
    name: 'Litecoin',
    symbol: 'LTC',
    apiUrl: (address) => `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`,
    balancePath: 'balance',
    balanceConverter: (satoshis) => satoshis / 1e8,
    fallbackApi: (address) => `https://api.blockcypher.com/v1/ltc/main/addrs/${address}`
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

  // sol doesn't play nice with the same code path as the rest — spent ages thinking i was dumb 😭
  if (currency.toUpperCase() === 'SOL') {
    try {
      const balance = await fetchSolanaBalance(address);
      return balance;
    } catch (error) {
      throw new Error(`Failed to fetch Solana balance: ${error.message}`);
    }
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
 * Fetch Solana balance using RPC endpoint
 */
async function fetchSolanaBalance(address) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    });

    const options = {
      hostname: 'api.mainnet-beta.solana.com',
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'User-Agent': 'Discord-Bot/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Solana RPC error: ${json.error.message}`));
            return;
          }
          if (!json.result || json.result.value === undefined) {
            reject(new Error('Invalid Solana RPC response'));
            return;
          }
          const lamports = json.result.value;
          const sol = lamports / 1e9;
          resolve(sol);
        } catch (e) {
          reject(new Error(`Failed to parse Solana balance: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Network error: ${e.message}`));
    });

    req.write(payload);
    req.end();
  });
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
 * Obfuscate a crypto address to show only first and last few characters
 */
function obfuscateAddress(address) {
  if (!address || address.length <= 10) {
    return address;
  }
  const start = address.substring(0, 6);
  const end = address.substring(address.length - 4);
  return `${start}...${end}`;
}

module.exports = {
  fetchCryptoBalance,
  getCurrencyName,
  getCurrencySymbol,
  fetchCryptoPrice,
  convertToUSD,
  obfuscateAddress,
  CRYPTO_CONFIG
};

