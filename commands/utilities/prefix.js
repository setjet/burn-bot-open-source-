const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../storedata.json');

function loadPrefixes() {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return data.serverPrefixes || {};
    }
  } catch (err) {
    console.error('Error loading prefixes:', err);
  }
  return {};
}

function savePrefix(guildId, prefix) {
  try {
    let data = {};
    if (fs.existsSync(storePath)) {
      data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
    if (!data.serverPrefixes) data.serverPrefixes = {};
    data.serverPrefixes[guildId] = prefix;
    // Preserve all other data fields
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving prefix:', err);
  }
}

module.exports = {
  name: 'prefix',
  aliases: [],
  category: 'moderation',
  description: '<:arrows:1363099226375979058> Change the bot prefix for this server.',
  async execute(message, args, { prefix }) {
    // Check permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to use this command.')
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
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}prefix set (char)\`\`\``,
              '-# <:arrows:1363099226375979058> Change the bot prefix for this server.',
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
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}prefix set <new prefix>\`\`\``,
                '-# <:arrows:1363099226375979058> Set a new prefix for this server.',
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
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Prefix must be **5 characters or less**.')
          ]
        });
      }

      if (newPrefix.includes(' ')) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Prefix **cannot contain spaces**.')
          ]
        });
      }

      // Save the new prefix
      savePrefix(message.guild.id, newPrefix);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Prefix changed** to \`${newPrefix}\``)
            .addFields(
              { name: '', value: `-# Use \`${newPrefix}help\` to see commands.` }
            )
        ]
      });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}prefix set <new prefix>\`\`\``,
            '-# <:arrows:1363099226375979058> Change the bot prefix for this server.',
            '',
            `**Current Prefix:** \`${prefix}\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'))
      ]
    });
  },

  // Export helper functions for use in index.js
  loadPrefixes,
  savePrefix
};

