const { EmbedBuilder } = require('discord.js');

// transfer ownership — "it's your problem now" the command 😭

module.exports = {
  name: 'transfer',
  async execute(message, args, { prefix, voiceChannel, channelData, getUser, db }) {
    const targetMemberInput = args[1];
    if (!targetMemberInput) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}voicemaster transfer <member>\`\`\``,
          '-# <:arrows:1457808531678957784> Transfers channel ownership to a member in the channel.'
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const targetUser = await getUser(message, targetMemberInput);
    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Member not found.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const targetMember = voiceChannel.members.get(targetUser.id);
    if (!targetMember) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> That member must be in this channel to receive ownership.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (targetUser.id === channelData.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> They already own this channel.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, ownerId: targetUser.id });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Ownership transferred to ' + targetUser + '.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
