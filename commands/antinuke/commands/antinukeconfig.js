const { EmbedBuilder } = require('discord.js');
const { getAntinukeConfig } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    const config = getAntinukeConfig(message.guild.id);
    const enabledModules = Object.entries(config.modules || {})
      .filter(([_, mod]) => mod.enabled)
      .map(([name, mod]) => {
        const punishment = mod.punishment || 'ban';
        const threshold = mod.threshold || 3;
        const command = mod.command !== false ? 'on' : 'off';
        return `• **${name}**: Threshold: \`${threshold}\`, Punishment: \`${punishment}\`, Command: \`${command}\``;
      });
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setTitle('<:sh1eld:1363214433136021948> Antinuke Configuration')
          .setDescription([
            enabledModules.length > 0 
              ? `**Enabled Modules:**\n${enabledModules.join('\n')}` 
              : '**No modules enabled**',
            '',
            '**Settings:**',
            `• **Time Window:** \`${(config.timeWindow || 10000) / 1000}s\``,
            `• **Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '`Not set`'}`,
            '',
            '**Whitelisted Users:**',
            config.whitelist && config.whitelist.length > 0 
              ? config.whitelist.map(id => `• <@${id}>`).join('\n')
              : '• `None`',
            '',
            '**Antinuke Admins:**',
            config.admins && config.admins.length > 0 
              ? config.admins.map(id => `• <@${id}>`).join('\n')
              : '• `None`'
          ].join('\n'))
      ]
    });
  }
};

