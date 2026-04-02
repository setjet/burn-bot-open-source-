const { EmbedBuilder } = require('discord.js');

// unghost: making the channel visible again (and my sanity briefly) 😭

module.exports = {
  name: 'unghost',
  async execute(message, args, { guild, voiceChannel, channelData, db }) {
    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null }).catch(() => {});
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, hidden: false });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Channel is now **visible**.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
