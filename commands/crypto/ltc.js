const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const { getCurrencySymbol, fetchCryptoBalance, convertToUSD, obfuscateAddress } = require('./utils');
const { assertCryptoPremium } = require('./premiumCheck');

module.exports = {
  name: 'ltc',
  aliases: ['litecoin'],
  description: '<:arrows:1457808531678957784> Manage your Litecoin wallet address.',
  async execute(message, args, { prefix, client, dbHelpers }) {
    if (!(await assertCryptoPremium(message, client, dbHelpers))) return;
    // litecoin: the chill cousin that still breaks when the api sneezes 😭

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
                `-# Use \`${prefix}ltc set\` to set your wallet address.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // satoshi-ish units hiding in plain sight — naming is a prank 😭
      let balance = null;
      let balanceError = null;
      let usdValue = 0;
      try {
        balance = await fetchCryptoBalance(currency, wallet.address);
        // Validate balance is a valid number
        if (!isNaN(balance) && isFinite(balance)) {
          try {
            usdValue = await convertToUSD(currency, balance);
          } catch (priceError) {
            console.error(`Error fetching price for ${currency}:`, priceError);
            usdValue = 0;
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
        statusLines.push(`> **Balance:** \`${balanceFormatted} ${getCurrencySymbol(currency)}\` (**$${usdFormatted})**`);
      } else if (balanceError) {
        statusLines.push(`> **Balance:** \`Error: ${balanceError}\``);
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          `<:arrows:1457808531678957784> **Litecoin Wallet**`,
          '',
          ...statusLines
        ].join('\n'))
        .addFields([
          { name: '', value: `-# Use \`${prefix}ltc set\` to update your wallet.`, inline: false }
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
              `<:alert:1457808529200119880> <:arrows:1457808531678957784> **Wallet Already Verified**`,
              '',
              `> You already have a verified **Litecoin** wallet set.`,
              `<:tree:1457808523986731008> Address: \`${obfuscateAddress(existingWallet.address)}\``,
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
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Verification Cancelled**`,
              ].join('\n'))
              ],
              components: []
            });
            return;
          }

          // User clicked Yes, proceed with verification and update the embed
          await proceedWithVerification(message, userId, currency, prefix, interaction);
        } catch (error) {
          console.error('Error in wallet verification confirmation:', error);
          await msg.edit({ components: [] }).catch(() => {});
        }
        return;
      }

      // Proceed with verification
      return await proceedWithVerification(message, userId, currency, prefix);
    }

    async function proceedWithVerification(message, userId, currency, prefix, interaction = null) {
      const nonce = dbHelpers.createVerificationNonce(userId, currency, null, 10);
      // verification: same machinery, different coin emoji in the title 😭
      const verificationUrl = config.verificationUrl;
      if (!verificationUrl) {
        console.error('VERIFICATION_URL is not set');
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Verification Error**`,
                `-# <:tree:1457808523986731008> An error occurred while generating the **verification link**.`
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }
      const verificationLink = `${verificationUrl}/verify?discord_id=${userId}&nonce=${nonce}&currency=${currency}`;

      // Send DM with verification link
      const dmEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:arrows:1457808531678957784> **Verify Your Litecoin Wallet**')
        .setDescription([
          `Click the button below to verify your **Litecoin** wallet:`,
          '',
          `**What happens next:**`,
          `<:leese:1457834970486800567> Click the button below`,
          `<:leese:1457834970486800567> Connect your **Litecoin** wallet (MetaMask, Ledger, etc.)`,
          `<:tree:1457808523986731008> Your wallet is verified automatically`,
          `> **Note:** Verification link expires in **10 minutes**`,
          '',
          `-# Do **NOT** share this link with anyone else.`
        ].join('\n'))

      const verifyButton = new ButtonBuilder()
        .setLabel('Verify Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(verificationLink);

      const row = new ActionRowBuilder().addComponents(verifyButton);

      try {
        await message.author.send({ embeds: [dmEmbed], components: [row] });
        // if you see this twice, you probably clicked verify twice — i don't judge 😭

        // If called from button interaction, update the embed. Otherwise send a new message.
        if (interaction) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  `<:check:1457808518848581858> <:arrows:1457808531678957784> **A new verification link has been sent to your DMs.**`,
                  `-# <tree:1457808523986731008> Check your messages to connect your Litecoin wallet.`
                ].join('\n'))
            ],
            components: []
          });
        } else {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  `<:allowed:1457808577786806374> <:arrows:1457808531678957784> **Verification Link** sent to your **DMs**.`,
                  `-# <tree:1457808523986731008> The link expires in **10 minutes**.`
                ].join('\n'))
            ],
            allowedMentions: { repliedUser: false }
          });
        }
      } catch (error) {
        // If DM fails, tell user to open DMs
        if (interaction) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  `<:alert:1457808529200119880> <:arrows:1457808531678957784> I couldn't send you the **verification link**.`,
                  `-# <tree:1457808523986731008> Make sure your DMs are **enabled** for this server.`
                ].join('\n'))
            ],
            components: []
          });
        } else {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  `<:alert:1457808529200119880> <:arrows:1457808531678957784> I couldn't send you the **verification link**.`,
                  `-# <tree:1457808523986731008> Make sure your DMs are **enabled** for this server.`
                ].join('\n'))
            ],
            allowedMentions: { repliedUser: false }
          });
        }
      }
    }

    // still not a litecoin faucet — stop asking
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Unknown Subcommand**`,
            '',
            `-# Available commands:`,
            `> \`${prefix}ltc\` - View your wallet`,
            `> \`${prefix}ltc set\` - Set and verify your wallet`,
            `> \`${prefix}ltc remove\` - Remove your wallet`
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};
