const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'prefix',
  aliases: [],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Change the bot prefix for this server.',
  async execute(message, args, { prefix }) {
    // Check permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to use this command.')
        ]
      });
    }

    const subcommand = args[0]?.toLowerCase();

    // Show usage/current prefix if no subcommand
    if (!subcommand) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}prefix set (char)\`\`\``,
              '-# <:arrows:1457808531678957784> Change the bot prefix for this server.',
              '',
              `**Examples:** \`${prefix}prefix set !\``,
              '\n**Aliases:** `N/A`'
            ].join('\n'))
        ]
      });
    }

    // Handle set subcommand
    if (subcommand === 'set') {
      const newPrefix = args[1];

      if (!newPrefix) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}prefix set <new prefix>\`\`\``,
                '-# <:arrows:1457808531678957784> Set a new prefix for this server.',
                '',
                `**Examples:** \`${prefix}prefix set !\` \`${prefix}prefix set -\` \`${prefix}prefix set .\``,
                '\n**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      // Validate prefix
      if (newPrefix.length > 5) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Prefix must be **5 characters or less**.')
          ]
        });
      }

      if (newPrefix.includes(' ')) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Prefix **cannot contain spaces**.')
          ]
        });
      }

      // Save the new prefix
      dbHelpers.setServerPrefix(message.guild.id, newPrefix);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Prefix changed** to \`${newPrefix}\``)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}prefix set <new prefix>\`\`\``,
            '-# <:arrows:1457808531678957784> Change the bot prefix for this server.',
            '',
            `**Current Prefix:** \`${prefix}\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'))
      ]
    });
  },

};

