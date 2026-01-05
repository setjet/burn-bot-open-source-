const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dbHelpers } = require('../../db');

// Core commands that cannot be overridden
const PROTECTED_COMMANDS = ['alias', 'help', 'prefix', 'blacklist', 'reload', 'jsk', 'peep', 'givecoins'];

module.exports = {
  name: 'alias',
  aliases: [],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Manage command aliases for your server.',
  async execute(message, args, { prefix }) {
    if (!message.guild) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> This command can only be used in a **server**.');
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    // Check if user has administrator permissions
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to manage aliases.');
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}alias (subcommand) (args)\`\`\``,
              '-# <:arrows:1363099226375979058> Use `add` to create an alias, `remove` to delete one, `view` to see details, `list` to show all.',
              '',
              '**Aliases:** `N/A`'
            ].join('\n'))
        ]
      });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === 'add') {
      if (args.length < 3) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}alias add <shortcut> <command>\`\`\``,
                '-# <:arrows:1363099226375979058> Creates a shortcut for a command.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const shortcut = args[1].toLowerCase();
      const commandString = args.slice(2).join(' ');

      // Validate shortcut name
      if (!/^[a-z0-9_-]+$/i.test(shortcut)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias name can only contain **letters, numbers, hyphens, and underscores**.')
          ]
        });
      }

      // Check if shortcut conflicts with protected commands
      if (PROTECTED_COMMANDS.includes(shortcut)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> \`${shortcut}\` is a **protected command** and cannot be used as an **alias**.`)
          ]
        });
      }

      // Check if shortcut conflicts with existing commands
      if (message.client.commands.has(shortcut)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> \`${shortcut}\` is already a **command**. Please choose a different **alias name**.`)
          ]
        });
      }

      // Validate command string has at least a command name
      const commandParts = commandString.trim().split(/\s+/);
      if (!commandParts[0]) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Command string **cannot be empty**.')
          ]
        });
      }

      // Check if the target command exists
      const targetCommand = message.client.commands.get(commandParts[0].toLowerCase());
      if (!targetCommand) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Command \`${commandParts[0]}\` not found.`)
          ]
        });
      }

      // Validate placeholders (check for invalid placeholders like {10} when only {0}-{9} are provided)
      const placeholderRegex = /\{(\d+)\}/g;
      const placeholders = [];
      let match;
      while ((match = placeholderRegex.exec(commandString)) !== null) {
        placeholders.push(parseInt(match[1]));
      }
      const maxPlaceholder = placeholders.length > 0 ? Math.max(...placeholders) : -1;
      if (maxPlaceholder > 9) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Placeholders can only be {0} through {9}.')
          ]
        });
      }

      // Check if alias already exists
      const existingAlias = dbHelpers.getAlias(message.guild.id, shortcut);
      if (existingAlias) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias \`${shortcut}\` already exists. Use \`${prefix}alias remove ${shortcut}\` first.`)
          ]
        });
      }

      // Save alias
      dbHelpers.setAlias(message.guild.id, shortcut, commandString);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> Alias \`${shortcut}\` created successfully.\n\`${prefix}${shortcut}\` will execute: \`${commandString}\``)
        ]
      });
    }

    if (subcommand === 'remove' || subcommand === 'delete') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}alias remove <shortcut>\`\`\``,
                '-# <:arrows:1363099226375979058> Removes an alias by name.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const shortcut = args[1].toLowerCase();
      const existingAlias = dbHelpers.getAlias(message.guild.id, shortcut);

      if (!existingAlias) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias \`${shortcut}\` **does not exist**.`)
          ]
        });
      }

      dbHelpers.removeAlias(message.guild.id, shortcut);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> Alias \`${shortcut}\` **removed successfully**.`)
        ]
      });
    }

    if (subcommand === 'view' || subcommand === 'show') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}alias view <shortcut>\`\`\``,
                '-# <:arrows:1363099226375979058> Shows details about an alias.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const shortcut = args[1].toLowerCase();
      const aliasCommand = dbHelpers.getAlias(message.guild.id, shortcut);

      if (!aliasCommand) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias \`${shortcut}\` does not exist.`)
          ]
        });
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setTitle(`Alias: \`${shortcut}\``)
            .setDescription([
              `**Executes:** \`${aliasCommand}\``,
              '',
              `-# Use \`${prefix}${shortcut}\` to run this alias.`
            ].join('\n'))
        ]
      });
    }

    if (subcommand === 'list') {
      const aliases = dbHelpers.getAllAliases(message.guild.id);

      if (aliases.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}alias list\`\`\``,
                '-# <:arrows:1363099226375979058> List all aliases configured for this server.',
                '',
                '<:excl:1362858572677120252> <:arrows:1363099226375979058> No aliases configured for this server.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const aliasList = aliases.map(alias => `\`${alias.name}\` → \`${alias.command}\``).join('\n');

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setTitle(`Server Aliases [${aliases.length}]`)
            .setDescription(aliasList.length > 4096 ? aliasList.substring(0, 4093) + '...' : aliasList)
        ]
      });
    }

    if (subcommand === 'removeall' || subcommand === 'clear') {
      const aliases = dbHelpers.getAllAliases(message.guild.id);

      if (aliases.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> No aliases to remove.')
          ]
        });
      }

      dbHelpers.removeAllAliases(message.guild.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> Removed **${aliases.length}** alias${aliases.length === 1 ? '' : 'es'}.`)
        ]
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Unknown subcommand. Use \`${prefix}alias\` for help.`)
      ]
    });
  }
};

