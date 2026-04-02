/*
 * cryptoallow (alias: cryptallow) — Bot owner only (BOT_OWNER_ID).
 *
 * Maintains a global allowlist so users can use crypto commands (btc/eth/sol/ltc, etc.)
 * without the premium guild role when CRYPTO_BOT_GUILD_ID / CRYPTO_PREMIUM_ROLE_ID are set.
 *
 * Usage:
 *   <prefix>cryptoallow add <user>
 *   <prefix>cryptoallow remove <user>
 *   <prefix>cryptoallow list
 */

// tiny table, huge drama with "why can random user see btc" 😭

const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const config = require('../../config');

module.exports = {
  name: 'cryptoallow',
  aliases: ['cryptoallow', 'cryptallow'],
  category: 'admin',
  description: '<:arrows:1457808531678957784> Allow users to use crypto commands without premium role (Admin only).',
  async execute(message, args, { prefix, getUser }) {
    if (!config.botOwnerId || message.author.id !== config.botOwnerId) {
      return;
    }

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}cryptoallow add <user>\`\`\``,
              `\`\`\`${prefix}cryptoallow remove <user>\`\`\``,
              `\`\`\`${prefix}cryptoallow list\`\`\``,
              '-# <:arrows:1457808531678957784> Allow or remove users from crypto command access, or view all allowed users.',
              '',
              `**Examples:**`,
              `\`${prefix}cryptoallow add @user\``,
              `\`${prefix}cryptoallow add 123456789012345678\` (user ID)`,
              `\`${prefix}cryptoallow remove @user\``,
              `\`${prefix}cryptoallow list\``,
              '',
              '**Note:** Allowed users can use crypto commands in any server without needing the premium role.',
              '\n**Aliases:** `cryptallow`'
            ].join('\n'))
        ]
      });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === 'add') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1457808531678957784> Please provide a user to allow.\n\`\`\`${prefix}cryptoallow add <user>\`\`\``)
          ]
        });
      }

      const target = await getUser(message, args[1]);
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1457808531678957784> User \`${args[1]}\` not found.`)
          ]
        });
      }

      // Check if already allowed
      if (dbHelpers.isCryptoAllowedUser(target.id)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1457808531678957784> <@${target.id}> is already allowed to use crypto commands.`)
          ]
        });
      }

      dbHelpers.addCryptoAllowedUser(target.id);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setAuthor({ name: 'Crypto Access Granted', iconURL: target.displayAvatarURL({ dynamic: true }) })
        .setDescription([
          `<:check:1457808518848581858> <:arrows:1457808531678957784> **Added** <@${target.id}> to crypto allowed users.`,
          '',
          `> <@${target.id}> can now use crypto commands in any server without needing the premium role.`
        ].join('\n'))
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Username', value: `\`${target.tag}\``, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (subcommand === 'remove') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1457808531678957784> Please provide a user to remove.\n\`\`\`${prefix}cryptoallow remove <user>\`\`\``)
          ]
        });
      }

      const target = await getUser(message, args[1]);
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1457808531678957784> User \`${args[1]}\` not found.`)
          ]
        });
      }

      // Check if not allowed
      if (!dbHelpers.isCryptoAllowedUser(target.id)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1457808531678957784> <@${target.id}> is not in the allowed users list.`)
          ]
        });
      }

      dbHelpers.removeCryptoAllowedUser(target.id);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setAuthor({ name: 'Crypto Access Removed', iconURL: target.displayAvatarURL({ dynamic: true }) })
        .setDescription([
          `<:check:1457808518848581858> <:arrows:1457808531678957784> **Removed** <@${target.id}> from crypto allowed users.`,
          '',
          `> <@${target.id}> will now need the premium role to use crypto commands.`
        ].join('\n'))
        .addFields(
          { name: 'User', value: `<@${target.id}>`, inline: true },
          { name: 'User ID', value: `\`${target.id}\``, inline: true },
          { name: 'Username', value: `\`${target.tag}\``, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (subcommand === 'list') {
      const allowedUsers = dbHelpers.getAllCryptoAllowedUsers();

      if (allowedUsers.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1457808531678957784> No users are currently allowed to bypass premium role check.')
          ]
        });
      }

      // Fetch user info for display
      const userList = [];
      for (const userId of allowedUsers) {
        try {
          const user = await message.client.users.fetch(userId).catch(() => null);
          if (user) {
            userList.push(`<@${userId}> (\`${user.tag}\`)`);
          } else {
            userList.push(`\`${userId}\` (User not found)`);
          }
        } catch (error) {
          userList.push(`\`${userId}\` (Error fetching)`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Crypto Allowed Users')
        .setDescription(userList.join('\n') || 'None')
        .setFooter({ text: `Total: ${allowedUsers.length} user${allowedUsers.length !== 1 ? 's' : ''}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:excl:1362858572677120252> <:arrows:1457808531678957784> **Invalid subcommand.**',
            '',
            `**Usage:**`,
            `\`${prefix}cryptoallow add <user>\` - Allow a user`,
            `\`${prefix}cryptoallow remove <user>\` - Remove a user`,
            `\`${prefix}cryptoallow list\` - List all allowed users`
          ].join('\n'))
      ]
    });
  }
};

