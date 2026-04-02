const { EmbedBuilder } = require('discord.js');

// claim abandoned vc — abandoned module jokes write themselves 😭

module.exports = {
  name: 'claim',
  async execute(message, args, { voiceChannel, channelData, db }) {
    const inChannel = voiceChannel.members.has(message.author.id);
    if (!inChannel) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You must be in the channel to claim it.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const currentOwnerInChannel = voiceChannel.members.has(channelData.ownerId);
    if (currentOwnerInChannel) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The current owner is still in the channel. They must leave before you can claim.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, ownerId: message.author.id });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> You are now the **owner** of this channel.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
