const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  category: 'utilities', 
  description: '<:arrows:1363099226375979058> View information about a user.',
  async execute(message, args, { getUser }) {
    const targetUser = args[0] ? await getUser(message, args[0]) : message.author;

    if (!targetUser) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found`);
      return message.reply({ embeds: [errorEmbed] });
    }

    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: `${targetUser.tag}'s Info`, iconURL: targetUser.displayAvatarURL() })
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
        { name: 'Account Created', value: `\`${targetUser.createdAt.toLocaleDateString()}\``, inline: true },
        ...(member
          ? [
              { name: 'Server Joined', value: `\`${member.joinedAt.toLocaleDateString()}\``, inline: true },
              {
                name: `Roles [${member.roles.cache.filter(r => r.id !== message.guild.id).size}]`,
                value: member.roles.cache
                  .filter(role => role.id !== message.guild.id)
                  .map(role => role.toString())
                  .join(' ') || 'None',
              }
            ]
          : [])
      )
      .setFooter({
        text: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });

    try {
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in whois command:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while displaying user information.');
      await message.reply({ embeds: [errorEmbed] });
    }
  }
};
