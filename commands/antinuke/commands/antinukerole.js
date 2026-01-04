const { EmbedBuilder } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, parseFlags, canConfigureAntinuke } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    if (!canConfigureAntinuke(message)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Only the **server owner** or **antinuke admins** can configure this.')
        ]
      });
    }
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please specify \`on\` or \`off\`.\n\`\`\`${prefix}antinuke role (on|off) [--threshold (number)] [--do (punishment)] [--command (on|off)]\`\`\``)
        ]
      });
    }

    const status = args[1].toLowerCase();
    if (status !== 'on' && status !== 'off') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Status must be `on` or `off`.')
        ]
      });
    }

    const flags = parseFlags(args.slice(2));
    const config = getAntinukeConfig(message.guild.id);
    if (!config.modules) config.modules = {};
    
    if (!config.modules.role) {
      config.modules.role = {
        enabled: false,
        threshold: 3,
        punishment: 'ban',
        command: true
      };
    }

    if (status === 'off') {
      config.modules.role.enabled = false;
      saveAntinukeConfig(message.guild.id, config);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('<:check:1362850043333316659> <:arrows:1363099226375979058> **role** module disabled.')
        ]
      });
    }

    config.modules.role.enabled = true;
    
    if (flags.threshold !== undefined) {
      if (isNaN(flags.threshold) || flags.threshold < 1 || flags.threshold > 6) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Threshold must be a number between 1 and 6.')
          ]
        });
      }
      config.modules.role.threshold = flags.threshold;
    }
    
    if (flags.punishment) {
      const validPunishments = ['ban', 'kick', 'warn', 'jail', 'stripstaff'];
      if (!validPunishments.includes(flags.punishment)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Punishment must be one of: ${validPunishments.map(p => `\`${p}\``).join(', ')}.`)
          ]
        });
      }
      config.modules.role.punishment = flags.punishment;
    }
    
    if (flags.command !== undefined) {
      config.modules.role.command = flags.command;
    }

    saveAntinukeConfig(message.guild.id, config);
    
    const threshold = config.modules.role.threshold;
    const punishment = config.modules.role.punishment;
    const command = config.modules.role.command ? 'on' : 'off';
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57F287')
          .setDescription([
            `<:check:1362850043333316659> <:arrows:1363099226375979058> **role** module enabled.`,
            `Threshold: \`${threshold}\`, Punishment: \`${punishment}\`, Command: \`${command}\``
          ].join('\n'))
      ]
    });
  }
};

