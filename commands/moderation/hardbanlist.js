const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'hardbanlist',
  aliases: ['hbl'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> View all hardbanned users.',
  async execute(message) {
   
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to use this command.');
      return message.reply({ embeds: [embed] });
    }

    const guildId = message.guild.id;
    const hardbannedUsers = dbHelpers.getHardbannedUsers(guildId);

    if (!hardbannedUsers || hardbannedUsers.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> No **hardbanned** users found for this server.');
      return message.reply({ embeds: [embed] });
    }

    try {
      const bans = await message.guild.bans.fetch();
      const validHardbans = [];

      for (const userId of hardbannedUsers) {
        if (bans.has(userId)) {
          const banInfo = bans.get(userId);
          validHardbans.push({
            id: userId,
            tag: banInfo.user.tag,
            reason: banInfo.reason || 'No reason provided'
          });
        }
      }

      if (validHardbans.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> No **active hardbans** found.');
        return message.reply({ embeds: [embed] });
      }

    
      const formattedList = validHardbans.map((user, index) => {
        return `**${index + 1}.** <@${user.id}> (\`${user.id}\`)`;
    });

    const embed = new EmbedBuilder()
    .setColor('#838996')
    .setDescription(`-# <:disallowed:1363121898522673313> **Hardbanned Users:**\n\n${formattedList.join('\n\n')}`)
    .setFooter({ 
      text: `Total: ${validHardbans.length}`
    });
  
      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching bans:', error);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to fetch ban list. Please try again later.');
      await message.reply({ embeds: [embed] });
    }
  }
};