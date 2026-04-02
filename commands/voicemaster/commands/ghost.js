const { EmbedBuilder } = require('discord.js');

// ghost hide-y logic; testers still asked "where vc go" 😭

module.exports = {
  name: 'ghost',
  async execute(message, args, { guild, voiceChannel, channelData, db }) {
    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => {});
    const permit = [...new Set([...(channelData.permittedIds || []), channelData.ownerId])];
    for (const id of permit) {
      const permType = guild.roles.cache.has(id) ? 0 : 1;
      await voiceChannel.permissionOverwrites.edit(id, { ViewChannel: true, Connect: true, type: permType }).catch(() => {});
    }
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, hidden: true });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Channel is now **hidden** from the channel list.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
