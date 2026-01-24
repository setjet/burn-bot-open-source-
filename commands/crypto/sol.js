const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { dbHelpers } = require('../../db');
const { validateAddress, getCurrencyName, getCurrencySymbol, fetchCryptoBalance, fetchCryptoPrice, convertToUSD, obfuscateAddress } = require('./utils');

module.exports = {
  name: 'sol',
  aliases: ['solana'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Manage your Solana wallet address.',
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
    const currency = 'SOL';

    if (args.length === 0) {
      // Show current wallet if set
      const wallet = dbHelpers.getCryptoWallet(userId, currency);
      if (!wallet) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:arrows:1457808531678957784> **Solana Wallet**`,
                '',
                `> No wallet address set.`,
                '',
                `-# Use \`${prefix}sol set\` to set your wallet address.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Fetch balance
      let balance = null;
      let balanceError = null;
      let usdValue = 0;
      try {
        balance = await fetchCryptoBalance(currency, wallet.address);
        // Validate balance is a valid number
        if (!isNaN(balance) && isFinite(balance)) {
          try {
            const price = await fetchCryptoPrice(currency);
            usdValue = convertToUSD(balance, price);
          } catch (priceError) {
            console.error(`Error fetching price for ${currency}:`, priceError);
          }
        } else {
          balanceError = 'Invalid balance response from API';
          balance = null;
        }
      } catch (error) {
        balanceError = error.message || 'Failed to fetch balance';
        console.error(`Error fetching ${currency} balance for ${wallet.address}:`, error);
      }

      // Build wallet info
      const statusLines = [];
      statusLines.push(`> **Address:** \`${obfuscateAddress(wallet.address)}\``);
      statusLines.push(`> **Verified:** ${wallet.verified ? '<:allowed:1457808577786806374> Yes' : '<:disallowed:1457808577786806375> No'}`);
      if (balance !== null) {
        const balanceFormatted = balance.toLocaleString('en-US', { maximumFractionDigits: 8, minimumFractionDigits: 0 });
        const usdFormatted = usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        statusLines.push(`> **Balance:** \`${balanceFormatted} ${getCurrencySymbol(currency)} ($${usdFormatted} USD)\``);
      } else if (balanceError) {
        statusLines.push(`> **Balance:** \`Error: ${balanceError}\``);
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          `<:arrows:1457808531678957784> **Solana Wallet**`,
          '',
          ...statusLines
        ].join('\n'))
        .addFields([
          { name: '', value: `-# Use \`${prefix}sol set\` to update your wallet.`, inline: false }
        ]);

      return message.reply({ 
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === 'set') {
      // Check if user already has a verified wallet
      const existingWallet = dbHelpers.getCryptoWallet(userId, currency);
      if (existingWallet && existingWallet.verified) {
        const yesButton = new ButtonBuilder()
          .setCustomId('verify_yes')
          .setLabel('Yes')
          .setStyle(ButtonStyle.Success);

        const noButton = new ButtonBuilder()
          .setCustomId('verify_no')
          .setLabel('No')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(yesButton, noButton);

        const msg = await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Wallet Already Verified**`,
                '',
                `> You already have a verified **Solana** wallet set.`,
                `> Address: \`${obfuscateAddress(existingWallet.address)}\``,
                '',
                `**Do you want to verify a different wallet?**`
              ].join('\n'))
          ],
          components: [row],
          allowedMentions: { repliedUser: false }
        });

        try {
          const filter = (interaction) => interaction.user.id === message.author.id && (interaction.customId === 'verify_yes' || interaction.customId === 'verify_no');
          const interaction = await msg.awaitMessageComponent({ filter, time: 30000 });

          if (interaction.customId === 'verify_no') {
            await interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription([
                    `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Cancelled**`,
                    '',
                    `> Verification cancelled.`
                  ].join('\n'))
              ],
              components: []
            });
            return;
          }

          // User clicked Yes, proceed with verification
          await interaction.deferUpdate();
          await proceedWithVerification(message, userId, currency, prefix);
        } catch (error) {
          console.error('Error in wallet verification confirmation:', error);
          await msg.edit({ components: [] }).catch(() => {});
        }
        return;
      }

      // Proceed with verification
      await proceedWithVerification(message, userId, currency, prefix);
    }

    async function proceedWithVerification(message, userId, currency, prefix) {
      // Generate verification nonce (no address needed - user will connect wallet)
      const nonce = dbHelpers.createVerificationNonce(userId, currency, null, 10);
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
        .setTitle('<:arrows:1457808531678957784> **Verify Your Solana Wallet**')
        .setDescription([
          `Click the link below to verify your Solana wallet:`,
          `[🔗 Verify Wallet](${verificationLink})`,
          '',
          `**What happens next:**`,
          `1. Click the link above`,
          `2. Connect your Solana wallet (Phantom, Solflare, etc.)`,
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
                `Click the link in your DMs to connect your Solana wallet and verify ownership.`,
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

    // Unknown subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Unknown Command**`,
            '',
            `> Use \`${prefix}sol set\` to set your wallet.`,
            `> Use \`${prefix}sol\` to view your wallet.`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};
