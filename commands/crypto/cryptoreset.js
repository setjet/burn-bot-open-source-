const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

const REQUIRED_ROLE_ID = '1458579256077586453'; // Same role as other crypto commands

module.exports = {
  name: 'cryptoreset',
  aliases: ['cr'],
  category: 'crypto',
  description: '<:arrows:1457808531678957784> Reset your own crypto data.',
  async execute(message, args, { prefix }) {
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
      
      // Also delete any pending verification nonces for this user
      const noncesDeleted = dbHelpers.deleteUserNonces(userId);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#43b581')
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

