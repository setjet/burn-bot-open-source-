const { EmbedBuilder } = require('discord.js');
const { getAntinukeConfig } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    const config = getAntinukeConfig(message.guild.id);
    const enabledModules = Object.keys(config.modules || {}).filter(name => config.modules[name].enabled);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setTitle('<:sh1eld:1363214433136021948> Antinuke Modules & Whitelist')
          .setDescription([
            '**Enabled Modules:**',
            enabledModules.length > 0 
              ? enabledModules.map(m => `• \`${m}\``).join('\n')
              : '• `None`',
            '',
            '**Whitelisted Users:**',
            config.whitelist && config.whitelist.length > 0 
              ? config.whitelist.map(id => `• <@${id}>`).join('\n')
              : '• `None`'
          ].join('\n'))
      ]
    });
  }
};

