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
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please specify \`on\` or \`off\`.\n\`\`\`${prefix}antinuke vanity (on|off) [--do (punishment)]\`\`\``)
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
    
    if (!config.modules.vanity) {
      config.modules.vanity = {
        enabled: false,
        threshold: 1,
        punishment: 'ban',
        command: false
      };
    }

    if (status === 'off') {
      config.modules.vanity.enabled = false;
      saveAntinukeConfig(message.guild.id, config);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('<:check:1362850043333316659> <:arrows:1363099226375979058> **vanity** module disabled.')
        ]
      });
    }

    config.modules.vanity.enabled = true;
    
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
      config.modules.vanity.punishment = flags.punishment;
    }

    saveAntinukeConfig(message.guild.id, config);
    
    const punishment = config.modules.vanity.punishment;
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57F287')
          .setDescription([
            `<:check:1362850043333316659> <:arrows:1363099226375979058> **vanity** module enabled.`,
            `Punishment: \`${punishment}\``
          ].join('\n'))
      ]
    });
  }
};

