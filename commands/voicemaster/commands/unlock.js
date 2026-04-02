const { EmbedBuilder } = require('discord.js');

// unlock vc — the "undo" button everyone spammed during testing 😭

module.exports = {
  name: 'unlock',
  async execute(message, args, { guild, voiceChannel, channelData, db }) {
    const everyone = guild.roles.everyone;
    await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null }).catch(() => {});
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, locked: false });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Channel **unlocked**.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
