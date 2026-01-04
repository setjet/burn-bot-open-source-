const { EmbedBuilder } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, canConfigureAntinuke } = require('../utils');

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
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please specify \`on\` or \`off\`.\n\`\`\`${prefix}antinuke botadd (on|off)\`\`\``)
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

    const config = getAntinukeConfig(message.guild.id);
    if (!config.modules) config.modules = {};
    
    if (!config.modules.botadd) {
      config.modules.botadd = {
        enabled: false,
        threshold: 1,
        punishment: 'ban',
        command: false
      };
    }

    if (status === 'off') {
      config.modules.botadd.enabled = false;
      saveAntinukeConfig(message.guild.id, config);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('<:check:1362850043333316659> <:arrows:1363099226375979058> **botadd** module disabled.')
        ]
      });
    }

    config.modules.botadd.enabled = true;
    saveAntinukeConfig(message.guild.id, config);
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57F287')
          .setDescription('<:check:1362850043333316659> <:arrows:1363099226375979058> **botadd** module enabled.')
      ]
    });
  }
};

