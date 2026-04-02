const { EmbedBuilder } = require('discord.js');

// "just play music" — famous unfinished last words 😭

module.exports = {
  name: 'music',
  async execute(message, args, { client, guild, voiceChannel, channelData, db, isOwnerOrStaff }) {
    if (!isOwnerOrStaff) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **channel owner** (the user who created it) can toggle music mode.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (!voiceChannel || !channelData) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Join a VoiceMaster channel first, then run this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const next = !channelData.musicMode;
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, musicMode: next });
    const everyone = guild.roles.everyone;
    if (next) {
      await voiceChannel.permissionOverwrites.edit(everyone, { Speak: false, Stream: false }).catch(() => {});
      await voiceChannel.permissionOverwrites.edit(client.user.id, { Speak: true, Stream: true }).catch(() => {});
    } else {
      await voiceChannel.permissionOverwrites.edit(everyone, { Speak: null, Stream: null }).catch(() => {});
    }
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Music mode **' + (next ? 'enabled' : 'disabled') + '** for this channel.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
