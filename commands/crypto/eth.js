const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const { validateAddress, getCurrencyName, getCurrencySymbol, fetchCryptoBalance } = require('./utils');

module.exports = {
  name: 'eth',
  aliases: ['ethereum'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Manage your Ethereum wallet address.',
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
    
    const userId = message.author.id;
    const currency = 'ETH';

    if (args.length === 0) {
      // Show current wallet if set
      const wallet = dbHelpers.getCryptoWallet(userId, currency);
      if (!wallet) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:arrows:1457808531678957784> **Ethereum Wallet**`,
                '',
                `> No wallet address set.`,
                '',
                `-# Use \`${prefix}eth set <address>\` to set your wallet address.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Re-validate address format (in case validation improved)
      const formatValidation = validateAddress(currency, wallet.address);
      const isValidFormat = formatValidation.valid;

      // Try to fetch balance (on-chain validation)
      let balance = null;
      let balanceError = null;
      let onChainValid = false;
      try {
        balance = await fetchCryptoBalance(currency, wallet.address);
        // Validate balance is a valid number
        if (isNaN(balance) || !isFinite(balance)) {
          balanceError = 'Invalid balance response from API';
          balance = null;
        } else {
          onChainValid = true; // Address exists on-chain if we got a balance
        }
      } catch (error) {
        balanceError = error.message || 'Failed to fetch balance';
        // If it's a format/address error, mark as invalid
        if (error.message && (error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('404'))) {
          onChainValid = false;
        }
        console.error(`Error fetching ETH balance for ${wallet.address}:`, error);
      }

      // Build status indicators
      const statusLines = [];
      statusLines.push(`> **Address:** \`${wallet.address}\``);
      statusLines.push(`> **Format Valid:** ${isValidFormat ? '<:allowed:1457808577786806374> Yes' : '<:disallowed:1457808577786806375> No'}`);
      if (!isValidFormat && formatValidation.error) {
        statusLines.push(`> **Format Error:** ${formatValidation.error}`);
      }
      statusLines.push(`> **On-Chain Valid:** ${onChainValid ? '<:allowed:1457808577786806374> Yes' : '<:disallowed:1457808577786806375> No'}`);
      statusLines.push(`> **Verified:** ${wallet.verified ? '<:allowed:1457808577786806374> Yes' : '<:disallowed:1457808577786806375> No'}`);
      if (balance !== null) {
        statusLines.push(`> **Balance:** \`${balance.toLocaleString('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 0 })} ${getCurrencySymbol(currency)}\``);
      } else if (balanceError) {
        statusLines.push(`> **Balance:** \`Error: ${balanceError}\``);
      }

      const embed = new EmbedBuilder()
        .setColor(isValidFormat && onChainValid ? '#838996' : '#FF6B6B')
        .setDescription([
          `<:arrows:1457808531678957784> **Ethereum Wallet**`,
          '',
          ...statusLines
        ].join('\n'))
        .addFields([
          { name: '', value: `-# Use \`${prefix}eth set <address>\` to update your wallet.`, inline: false }
        ]);

      return message.reply({ 
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === 'set') {
      // Generate verification nonce (no address needed - user will connect wallet)
      const nonce = dbHelpers.createVerificationNonce(userId, currency, null, 10); // 10 minute expiry, address set during verification
      const verificationUrl = process.env.VERIFICATION_URL;
      if (!verificationUrl) {
        console.error('VERIFICATION_URL is not set in environment variables!');
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF6B6B')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Configuration Error**`,
                '',
                `> Verification URL is not configured.`,
                '',
                `-# Please set \`VERIFICATION_URL\` in your bot's environment variables.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }
      const verificationLink = `${verificationUrl}/verify?discord_id=${userId}&nonce=${nonce}&currency=${currency}`;

      // Send DM with verification link
      const dmEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:arrows:1457808531678957784> **Verify Your Ethereum Wallet**')
        .setDescription([
          `Click the link below to verify your Ethereum wallet:`,
          `[🔗 Verify Wallet](${verificationLink})`,
          '',
          `**What happens next:**`,
          `1. Click the link above`,
          `2. Connect your Ethereum wallet (MetaMask, WalletConnect, etc.)`,
          `3. That's it! Your wallet is verified automatically`,
          `4. Verification expires in **10 minutes**`,
          '',
          `-# This link is **single-use** and will expire soon.`
        ].join('\n'))
        .setFooter({ text: 'If you did not request this, please ignore this message.' });

      try {
        await message.author.send({ embeds: [dmEmbed] });
        
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Verification Link Sent**`,
                '',
                `**Check your DMs!**`,
                '',
                `Click the link in your DMs to connect your Ethereum wallet and verify ownership.`,
                '',
                `-# The link expires in **10 minutes**.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        // If DM fails, send in channel
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Verification Link**`,
                '',
                `**Click the link below to verify your wallet:**`,
                `[🔗 Verify Wallet](${verificationLink})`,
                '',
                `-# The link expires in **10 minutes**.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    // Legacy verify command - now handled via web interface
    if (subcommand === 'verify') {
      const wallet = dbHelpers.getCryptoWallet(userId, currency);
      if (!wallet) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **No Wallet Set**`,
                '',
                `> You don't have an Ethereum wallet address set.`,
                '',
                `-# Use \`${prefix}eth set <address>\` to set your wallet first.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (wallet.verified) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Already Verified**`,
                '',
                `> Your Ethereum wallet is already verified.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Generate new nonce for verification
      const nonce = dbHelpers.createVerificationNonce(userId, currency, wallet.address, 10);
      const verificationUrl = process.env.VERIFICATION_URL;
      if (!verificationUrl) {
        console.error('VERIFICATION_URL is not set in environment variables!');
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF6B6B')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Configuration Error**`,
                '',
                `> Verification URL is not configured.`,
                '',
                `-# Please set \`VERIFICATION_URL\` in your bot's environment variables.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }
      const verificationLink = `${verificationUrl}/verify?discord_id=${userId}&nonce=${nonce}`;

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:arrows:1457808531678957784> **Verification Link**`,
              '',
              `**Click the link below to verify your wallet:**`,
              `[🔗 Verify Wallet](${verificationLink})`,
              '',
              `-# This link expires in **10 minutes** and is **single-use**.`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'remove' || subcommand === 'delete') {
      const wallet = dbHelpers.getCryptoWallet(userId, currency);
      if (!wallet) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **No Wallet Set**`,
                '',
                `> You don't have an Ethereum wallet address set.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.removeCryptoWallet(userId, currency);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Wallet Removed**`,
              '',
              `> Your Ethereum wallet address has been removed.`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Unknown subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Unknown Subcommand**`,
            '',
            `-# Available commands:`,
            `> \`${prefix}eth\` - View your wallet`,
            `> \`${prefix}eth set <address>\` - Set your wallet address`,
            `> \`${prefix}eth verify <signature>\` - Verify wallet ownership`,
            `> \`${prefix}eth remove\` - Remove your wallet address`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};

