const { EmbedBuilder } = require('discord.js');

// lock vs hide vs ghost naming meeting could've been an email 😭

module.exports = {
  name: 'lock',
  async execute(message, args, { guild, voiceChannel, channelData, db }) {
    const everyone = guild.roles.everyone;
    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false }).catch(() => {});
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, locked: true });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Channel **locked**. Only permitted users and the owner can join.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
