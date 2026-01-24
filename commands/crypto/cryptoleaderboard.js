const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const { fetchCryptoBalance, getCurrencyName, getCurrencySymbol, convertToUSD, CRYPTO_CONFIG } = require('./utils');

module.exports = {
  name: 'cryptoleaderboard',
  aliases: ['cryptolb', 'clb', 'cryptorich'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> View the crypto leaderboard.',
  async execute(message, args, { prefix }) {
    // Role restriction: Only users with the specified role can use crypto commands
    const REQUIRED_ROLE_ID = '1458579256077586453';
    
    // Check if command is used in a server
    if (!message.guild) {
      return; // Ignore DMs
    }
    
    // Check if user has the required role
    const member = message.member;
    if (!member || !member.roles.cache.has(REQUIRED_ROLE_ID)) {
      return; // Ignore users without the role
    }

    // Get currency filter if provided
    let currencyFilter = null;
    if (args.length > 0) {
      const currencyArg = args[0].toUpperCase();
      if (CRYPTO_CONFIG[currencyArg]) {
        currencyFilter = currencyArg;
      }
    }

    // Get all users with crypto wallets
    const currencies = currencyFilter ? [currencyFilter] : ['SOL', 'ETH', 'BTC', 'LTC'];
    const userBalances = new Map(); // userId -> { maxUSD: number, bestWallet: {} }

    // Fetch balances for all users
    for (const currency of currencies) {
      const users = dbHelpers.getAllUsersWithCrypto(currency);
      
      for (const user of users) {
        try {
          // Fetch balance for this wallet
          const balance = await fetchCryptoBalance(currency, user.address);
          
          // Convert to USD
          const usdValue = await convertToUSD(currency, balance);
          
          if (!userBalances.has(user.userId)) {
            // First wallet for this user
            userBalances.set(user.userId, {
              maxUSD: usdValue,
              bestWallet: {
                currency,
                address: user.address,
                balance,
                usdValue,
                verified: user.verified
              }
            });
          } else {
            // Check if this wallet has more USD value than the current best
            const userData = userBalances.get(user.userId);
            if (usdValue > userData.maxUSD) {
              userData.maxUSD = usdValue;
              userData.bestWallet = {
                currency,
                address: user.address,
                balance,
                usdValue,
                verified: user.verified
              };
            }
          }
        } catch (error) {
          // Skip wallets that fail to fetch
          console.error(`Failed to fetch balance for ${currency} wallet ${user.address}:`, error.message);
        }
      }
    }

    if (userBalances.size === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:arrows:1457808531678957784> **Crypto Leaderboard**`,
              '',
              `> No users have set their crypto wallets yet.`,
              '',
              `-# Use \`${prefix}sol set <address>\`, \`${prefix}eth set <address>\`, etc. to set your wallet.`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Sort users by USD value (only showing their best wallet)
    const sortedUsers = Array.from(userBalances.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.maxUSD - a.maxUSD)
      .slice(0, 10); // Top 10

    // Fetch user info and build leaderboard
    const leaderboardEntries = [];
    for (let i = 0; i < sortedUsers.length; i++) {
      const { userId, maxUSD, bestWallet } = sortedUsers[i];
      
      try {
        const user = await message.client.users.fetch(userId).catch(() => null);
        
        // Format USD value
        const formattedUSD = maxUSD.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        
        // Format crypto balance
        const formattedBalance = bestWallet.balance.toLocaleString('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 0 });
        const currencySymbol = getCurrencySymbol(bestWallet.currency);
        
        const medal = i === 0 ? '🥇.' : i === 1 ? '🥈.' : i === 2 ? '🥉.' : `\`${i + 1}\`.`;
        leaderboardEntries.push(`> ${medal} <@${userId}> | **${formattedUSD}** (${formattedBalance} ${currencySymbol})`);
      } catch (error) {
        leaderboardEntries.push(`\`${i + 1}\`. **Unknown User** | **$${maxUSD.toFixed(2)}**`);
      }
    }

    const title = currencyFilter 
      ? `<:chest:1458071045251530773> **__${getCurrencyName(currencyFilter)} Leaderboard__**`
      : `<:chest:1458071045251530773> **__Crypto Leaderboard__**`;

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle(title)
      .setDescription(leaderboardEntries.join('\n\n'))
      .addFields([
        { 
          name: '', 
          value: `-# <:arrows:1457808531678957784> Top **${sortedUsers.length}** users by highest wallet value (USD)${currencyFilter ? ` (${getCurrencyName(currencyFilter)} only)` : ''}`, 
          inline: false 
        }
      ]);

    return message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};

