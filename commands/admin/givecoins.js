/*
 * givecoins (aliases: gc, addcoins) — Bot owner only (BOT_OWNER_ID).
 *
 * Grants economy coins to a user, or resets their balance to 0.
 *
 * Usage:
 *   <prefix>givecoins <user> <amount>
 *   <prefix>givecoins reset <user>
 */

// economy math: easy. embed spacing: twelve iterations 😭

const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const config = require('../../config');

module.exports = {
  name: 'givecoins',
  aliases: ['gc', 'addcoins'],
  category: 'admin',
  description: '<:arrows:1363099226375979058> Give coins to a user (Admin only).',
  async execute(message, args, { prefix, getUser }) {
    if (!config.botOwnerId || message.author.id !== config.botOwnerId) {
      return;
    }

    // Check for reset subcommand
    if (args[0]?.toLowerCase() === 'reset') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}givecoins reset <user>\`\`\``,
                '-# <:arrows:1363099226375979058> Reset a user\'s coin balance to 0.',
                '',
                `**Example:** \`${prefix}givecoins reset @user\``
              ].join('\n'))
          ]
        });
      }

      const target = await getUser(message, args[1]);
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[1]}\` not found.`)
          ]
        });
      }

      const oldBalance = dbHelpers.getBalance(target.id);
      if (oldBalance === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${target.id}> already has 0 coins.`)
          ]
        });
      }

      dbHelpers.setBalance(target.id, 0);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription([
          `<:check:1362850043333316659> <:arrows:1363099226375979058> **Balance Reset**`,
          '',
          `Reset <@${target.id}>'s balance to 0`,
          '',
          `**Previous balance:** \`${oldBalance.toLocaleString()}\` coins`,
          `**New balance:** \`0\` coins`
        ].join('\n'));

      return message.reply({ embeds: [embed] });
    }

    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}givecoins <user> <amount>\`\`\``,
              `\`\`\`${prefix}givecoins reset <user>\`\`\``,
              '-# <:arrows:1363099226375979058> Give coins to a user or reset their balance.',
              '',
              `**Examples:**`,
              `\`${prefix}givecoins @user 1000\``,
              `\`${prefix}givecoins reset @user\``,
              '\n**Aliases:** `gc`, `addcoins`'
            ].join('\n'))
        ]
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`)
        ]
      });
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a valid amount greater than 0.`)
        ]
      });
    }

    const oldBalance = dbHelpers.getBalance(target.id);
    const newBalance = dbHelpers.addBalance(target.id, amount);

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `<:check:1362850043333316659> <:arrows:1363099226375979058> **Coins Given**`,
        '',
        `Gave **${amount.toLocaleString()}** coins to <@${target.id}>`,
        '',
        `**Old balance:** \`${oldBalance.toLocaleString()}\` coins`,
        `**New balance:** \`${newBalance.toLocaleString()}\` coins`
      ].join('\n'));

    return message.reply({ embeds: [embed] });
  }
};

