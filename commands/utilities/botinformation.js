const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const os = require('os');


module.exports = {
  name: 'botinformation',
  aliases: ['bi'],
  category: ['miscellaneous'],
  description: ['<:arrows:1457808531678957784> View information about this bot.'],
  async execute(message) {
    try {
      const client = message.client;
      const totalGuilds = client.guilds.cache.size;
      const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      
      // Get version from package.json
      const packageJson = require('../../package.json');
      const botVersion = packageJson.version || '1.0.0';
      
      // Calculate uptime timestamp for Discord's relative time
      const uptimeTimestamp = Math.floor((Date.now() - client.uptime) / 1000);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:info:1457809654120714301> <:arrows:1457808531678957784> burn Information')
        .setThumbnail(client.user.displayAvatarURL({ size: 128, extension: 'png' }))
        .setDescription([
          `-# <:leese:1457834970486800567> **Uptime:** <t:${uptimeTimestamp}:R>`,
          `-# <:leese:1457834970486800567> **Members:** ${totalUsers.toLocaleString()}`,
          `-# <:leese:1457834970486800567> **Guilds:** ${totalGuilds.toLocaleString()}`,
          `-# <:tree:1457808523986731008> **Version:** ${botVersion}`,
        ].join('\n'))
        .addFields({
          name: '',
          value: `-# <:arrows:1457808531678957784> [@usync](https://discord.com/users/1355470391102931055) (Bot Developer)`
        });

      await message.reply({ 
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Botinformation command error:', error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:excl:1457809455268888679> <:arrows:1457808531678957784> **Error fetching bot information.**',
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
  }
};
