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
            .setDescription([
              '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Invalid usage.**',
              '',
              '**Usage:**',
              `\`\`\`${prefix}antinuke ban (on|off) [--threshold (number)] [--do (punishment)] [--command (on|off)]\`\`\``,
              '',
              '**Flags:**',
              '• `--threshold` - Number of actions before punishment (1-6)',
              '• `--do` - Punishment type: `ban`, `kick`, `warn`, `jail`, `stripstaff`',
              '• `--command` - Track bot commands: `on` or `off`'
            ].join('\n'))
        ]
      });
    }

    const status = args[1].toLowerCase();
    if (status !== 'on' && status !== 'off') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **Status must be** \`on\` **or** \`off\`.')
        ]
      });
    }

    const flags = parseFlags(args.slice(2));
    const config = getAntinukeConfig(message.guild.id);
    if (!config.modules) config.modules = {};
    
    if (!config.modules.ban) {
      config.modules.ban = {
        enabled: false,
        threshold: 5,
        punishment: 'ban',
        command: true
      };
    }

    if (status === 'off') {
      config.modules.ban.enabled = false;
      saveAntinukeConfig(message.guild.id, config);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1362850043333316659> <:arrows:1363099226375979058> **Ban module** has been **disabled**.')
        ]
      });
    }

    config.modules.ban.enabled = true;
    
    if (flags.threshold !== undefined) {
      if (isNaN(flags.threshold) || flags.threshold < 1 || flags.threshold > 6) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **Threshold must be a number between** \`1\` **and** \`6\`.')
          ]
        });
      }
      config.modules.ban.threshold = flags.threshold;
    }
    
    if (flags.punishment) {
      const validPunishments = ['ban', 'kick', 'warn', 'jail', 'stripstaff'];
      if (!validPunishments.includes(flags.punishment)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Invalid punishment type.**',
                '',
                '**Valid punishments:**',
                validPunishments.map(p => `• \`${p}\``).join('\n')
              ].join('\n'))
          ]
        });
      }
      config.modules.ban.punishment = flags.punishment;
    }
    
    if (flags.command !== undefined) {
      config.modules.ban.command = flags.command;
    }

    saveAntinukeConfig(message.guild.id, config);
    
    const threshold = config.modules.ban.threshold;
    const punishment = config.modules.ban.punishment;
    const command = config.modules.ban.command ? 'on' : 'off';
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:check:1362850043333316659> <:arrows:1363099226375979058> **Ban module** has been **enabled**.',
            '',
            '**Configuration:**',
            `• **Threshold:** \`${threshold}\``,
            `• **Punishment:** \`${punishment}\``,
            `• **Command Tracking:** \`${command}\``
          ].join('\n'))
      ]
    });
  }
};

