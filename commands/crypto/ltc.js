const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const { validateAddress, getCurrencyName, getCurrencySymbol, fetchCryptoBalance } = require('./utils');

module.exports = {
  name: 'ltc',
  aliases: ['litecoin'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Manage your Litecoin wallet address.',
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
    const currency = 'LTC';

    if (args.length === 0) {
      // Show current wallet if set
      const wallet = dbHelpers.getCryptoWallet(userId, currency);
      if (!wallet) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:arrows:1457808531678957784> **Litecoin Wallet**`,
                '',
                `> No wallet address set.`,
                '',
                `-# Use \`${prefix}ltc set <address>\` to set your wallet address.`
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
        if (!isNaN(balance) && isFinite(balance)) {
          onChainValid = true;
        } else {
          balanceError = 'Invalid balance response from API';
        }
      } catch (error) {
        balanceError = error.message || 'Failed to fetch balance';
        if (error.message && (error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('404'))) {
          onChainValid = false;
        }
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
          `<:arrows:1457808531678957784> **Litecoin Wallet**`,
          '',
          ...statusLines
        ].join('\n'))
        .addFields([
          { name: '', value: `-# Use \`${prefix}ltc set <address>\` to update your wallet.`, inline: false }
        ]);

      return message.reply({ 
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === 'set') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Invalid Usage**`,
                '',
                `-# Use \`${prefix}ltc set <address>\` to set your Litecoin wallet address.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const address = args[1];
      const formatValidation = validateAddress(currency, address);
      
      if (!formatValidation.valid) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Invalid Address**`,
                '',
                `> ${formatValidation.error}`,
                '',
                `-# Please provide a valid Litecoin wallet address.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Automatically validate on-chain (check if address exists)
      let onChainValid = false;
      let balance = null;
      let onChainError = null;
      
      try {
        balance = await fetchCryptoBalance(currency, address);
        if (!isNaN(balance) && isFinite(balance)) {
          onChainValid = true;
        } else {
          onChainError = 'Invalid balance response from API';
        }
      } catch (error) {
        onChainError = error.message || 'Failed to fetch balance';
        if (error.message && (error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('404'))) {
          onChainValid = false;
        }
      }

      // Set wallet (unverified by default)
      dbHelpers.setCryptoWallet(userId, currency, address, false);

      // Generate verification nonce
      const nonce = dbHelpers.createVerificationNonce(userId, currency, address, 10);
      const verificationUrl = process.env.VERIFICATION_URL || 'https://your-vercel-app.vercel.app';
      const verificationLink = `${verificationUrl}/verify?discord_id=${userId}&nonce=${nonce}`;

      // Build validation status
      const validationStatus = [];
      validationStatus.push(`**Address:** \`${address}\``);
      validationStatus.push(`**Format Valid:** <:allowed:1457808577786806374> Yes`);
      validationStatus.push(`**On-Chain Valid:** ${onChainValid ? '<:allowed:1457808577786806374> Yes' : '<:disallowed:1457808577786806375> No'}`);
      if (onChainValid && balance !== null) {
        validationStatus.push(`**Balance:** \`${balance.toLocaleString('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 0 })} ${getCurrencySymbol(currency)}\``);
      } else if (onChainError) {
        validationStatus.push(`**On-Chain Error:** ${onChainError}`);
      }

      // Send DM with verification link
      const dmEmbed = new EmbedBuilder()
        .setColor(onChainValid ? '#838996' : '#FFA500')
        .setTitle('<:arrows:1457808531678957784> **Wallet Set & Validated**')
        .setDescription([
          ...validationStatus,
          '',
          `**To verify ownership, click the link below:**`,
          `[🔗 Verify Wallet](${verificationLink})`,
          '',
          `**Instructions:**`,
          `1. Click the verification link above`,
          `2. Connect your wallet`,
          `3. Sign the message to verify ownership`,
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
              .setColor(onChainValid ? '#838996' : '#FFA500')
              .setDescription([
                `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Wallet Set & Validated**`,
                '',
                ...validationStatus,
                '',
                `**Verification link sent via DM!**`,
                '',
                `-# Check your DMs to verify your wallet. The link expires in 10 minutes.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        // If DM fails, send in channel
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(onChainValid ? '#838996' : '#FFA500')
              .setDescription([
                `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Wallet Set & Validated**`,
                '',
                ...validationStatus,
                '',
                `**Verification link:**`,
                `[🔗 Click here to verify](${verificationLink})`,
                '',
                `-# This link expires in **10 minutes**.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

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
                `> You don't have a Litecoin wallet address set.`,
                '',
                `-# Use \`${prefix}ltc set <address>\` to set your wallet first.`
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
                `> Your Litecoin wallet is already verified.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Generate new nonce for verification
      const nonce = dbHelpers.createVerificationNonce(userId, currency, wallet.address, 10);
      const verificationUrl = process.env.VERIFICATION_URL || 'https://your-vercel-app.vercel.app';
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
                `> You don't have a Litecoin wallet address set.`
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
              `> Your Litecoin wallet address has been removed.`
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
            `> \`${prefix}ltc\` - View your wallet`,
            `> \`${prefix}ltc set <address>\` - Set your wallet address`,
            `> \`${prefix}ltc verify <signature>\` - Verify wallet ownership`,
            `> \`${prefix}ltc remove\` - Remove your wallet address`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};

