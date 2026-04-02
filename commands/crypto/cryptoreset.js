const { EmbedBuilder } = require('discord.js');
const { assertCryptoPremium } = require('./premiumCheck');

// "just wipe the row" — famous last words before edge cases appeared 😭

module.exports = {
  name: 'cryptoreset',
  aliases: ['cr'],
  category: 'crypto',
  description: '<:arrows:1457808531678957784> Reset your own crypto data.',
  async execute(message, args, { prefix, client, dbHelpers }) {
    if (!(await assertCryptoPremium(message, client, dbHelpers))) return;

    const userId = message.author.id;

    // Check if user has any crypto data to reset
    const allWallets = dbHelpers.getAllCryptoWallets(userId);
    const walletCount = Object.keys(allWallets).length;

    if (walletCount === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You have no **crypto data** to reset.`,
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Require confirmation argument
    if (!args[0] || args[0].toLowerCase() !== 'confirm') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF4D4D')
            .setDescription([
              `<:alert:1457808529200119880> <:arrows:1457808531678957784> **Reset Your Crypto Data**`,
              '',
              `<:leese:1457834970486800567> This will delete **all your crypto wallets and verification data.**`,
              `<:tree:1457808523986731008> You will need to **set** and **verify** your wallets again.`,
              '',
              `> **Wallets to be deleted:**`,
              ...Object.keys(allWallets).map(currency => `• ${currency}`),
              '',
              `> **To confirm, run:**`,
              `\`${prefix}cr confirm\``,
              '',
              `-# Warning: This action **cannot be undone.**`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Reset user's crypto data
    try {
      dbHelpers.removeCryptoWallet(userId, null); // Pass null to remove all currencies
      dbHelpers.deleteUserNonces(userId);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:check:1457808518848581858> <:arrows:1457808531678957784> All your crypto data have been reset.`,
              `-# <:tree:1457808523986731008> You can now **set** and **verify** your wallets again.`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Error during crypto reset:', error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF6B6B')
            .setDescription([
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while resetting your crypto data.`,
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};

