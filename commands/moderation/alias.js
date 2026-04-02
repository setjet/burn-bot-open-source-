const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dbHelpers } = require('../../db');

// recursive alias calling itself infinite loop — i met him personally 😭
// Core commands that cannot be overridden
const PROTECTED_COMMANDS = ['alias', 'help', 'prefix', 'blacklist', 'reload', 'jsk', 'peep', 'givecoins'];

module.exports = {
  name: 'alias',
  aliases: [],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Manage command aliases for your server.',
  async execute(message, args, { prefix, dbHelpers: dbHelpersParam }) {
    try {
      if (!message.guild) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This command can only be used in a **server**.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      // Check if dbHelpers is available
      const dbHelpers = dbHelpersParam || require('../../db').dbHelpers;
      if (!dbHelpers) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Database is not available. Please contact the bot developer.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      // Check if user has administrator permissions
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to manage aliases.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}alias (subcommand) (args)\`\`\``,
              '-# <:arrows:1457808531678957784> **__Subcommand:__** \n <:leese:1457834970486800567> `add` to create an alias \n <:leese:1457834970486800567> `remove` to delete one\n <:leese:1457834970486800567>`view` to see details \n <:tree:1457808523986731008>`list` to show all.',
              '',
              '**Aliases:** `N/A`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
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
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}alias add <shortcut> <command>\`\`\``,
                '-# <:arrows:1457808531678957784> Creates a shortcut for a command.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
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
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Alias name can only contain **letters, numbers, hyphens, and underscores**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if shortcut conflicts with protected commands
      if (PROTECTED_COMMANDS.includes(shortcut)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> \`${shortcut}\` is a **protected command** and cannot be used as an **alias**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if shortcut conflicts with existing commands
      if (!message.client || !message.client.commands) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Unable to access command registry.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (message.client.commands.has(shortcut)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> \`${shortcut}\` is already a **command**. \n-# <:tree:1457808523986731008> Please choose a different **alias name**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Validate command string has at least a command name
      const commandParts = commandString.trim().split(/\s+/);
      if (!commandParts[0]) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Command string **cannot be empty**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if the target command exists
      if (!message.client || !message.client.commands) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Unable to access command registry.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      const targetCommand = message.client.commands.get(commandParts[0].toLowerCase());
      if (!targetCommand) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Command \`${commandParts[0]}\` **not found**.`)
          ],
          allowedMentions: { repliedUser: false }
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
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Placeholders can only be {0} through {9}.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if alias already exists
      let existingAlias;
      try {
        existingAlias = dbHelpers.getAlias(message.guild.id, shortcut);
      } catch (error) {
        console.error('Error checking existing alias:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while checking for existing aliases.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (existingAlias) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Alias \`${shortcut}\` already exists. \n -# <:tree:1457808523986731008> Use \`${prefix}alias remove ${shortcut}\` first.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Save alias
      try {
        dbHelpers.setAlias(message.guild.id, shortcut, commandString);
      } catch (error) {
        console.error('Error saving alias:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to save alias to database. Please try again.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Alias \`${shortcut}\` created **successfully**. \n-# <:tree:1457808523986731008> \`${prefix}${shortcut}\` will execute: \`${commandString}\``)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'remove' || subcommand === 'delete') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}alias remove <shortcut>\`\`\``,
                '-# <:arrows:1457808531678957784> Removes an alias by name.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const shortcut = args[1].toLowerCase();
      let existingAlias;
      try {
        existingAlias = dbHelpers.getAlias(message.guild.id, shortcut);
      } catch (error) {
        console.error('Error checking alias:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while checking for the alias.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (!existingAlias) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Alias \`${shortcut}\` **does not exist**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      try {
        dbHelpers.removeAlias(message.guild.id, shortcut);
      } catch (error) {
        console.error('Error removing alias:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to remove alias from database. Please try again.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Alias \`${shortcut}\` **removed successfully**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'view' || subcommand === 'show') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}alias view <shortcut>\`\`\``,
                '-# <:arrows:1457808531678957784> Shows details about an alias.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const shortcut = args[1].toLowerCase();
      let aliasCommand;
      try {
        aliasCommand = dbHelpers.getAlias(message.guild.id, shortcut);
      } catch (error) {
        console.error('Error fetching alias:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while fetching the alias.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (!aliasCommand) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Alias \`${shortcut}\` does not exist.`)
          ],
          allowedMentions: { repliedUser: false }
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
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'list') {
      let aliases;
      try {
        aliases = dbHelpers.getAllAliases(message.guild.id);
      } catch (error) {
        console.error('Error fetching aliases:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while fetching aliases.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (aliases.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}alias list\`\`\``,
                '-# <:arrows:1457808531678957784> List all aliases configured for this server.',
                '',
                '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No aliases configured for this server.',
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const aliasList = aliases.map(alias => `\`${alias.name}\` → \`${alias.command}\``).join('\n');

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setTitle(`Server Aliases [${aliases.length}]`)
            .setDescription(aliasList.length > 4096 ? aliasList.substring(0, 4093) + '...' : aliasList)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'removeall' || subcommand === 'clear') {
      let aliases;
      try {
        aliases = dbHelpers.getAllAliases(message.guild.id);
      } catch (error) {
        console.error('Error fetching aliases:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while fetching aliases.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (aliases.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No aliases to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      try {
        dbHelpers.removeAllAliases(message.guild.id);
      } catch (error) {
        console.error('Error removing all aliases:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to remove aliases from database. Please try again.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Removed **${aliases.length}** alias${aliases.length === 1 ? '' : 'es'}.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Unknown subcommand. Use \`${prefix}alias\` for help.`)
      ],
      allowedMentions: { repliedUser: false }
    });
    } catch (error) {
      console.error('Error in alias command:', error);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An unexpected error occurred while executing this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }
  }
};

