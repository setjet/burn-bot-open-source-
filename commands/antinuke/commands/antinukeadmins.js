const { EmbedBuilder } = require('discord.js');
const { getAntinukeConfig } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    const config = getAntinukeConfig(message.guild.id);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setTitle('<:sh1eld:1363214433136021948> Antinuke Administrators')
          .setDescription(
            config.admins && config.admins.length > 0 
              ? config.admins.map(id => `• <@${id}>`).join('\n')
              : '• `No antinuke admins configured.`'
          )
      ]
    });
  }
};

