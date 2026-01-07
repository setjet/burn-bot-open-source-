const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'roleinfo',
  aliases: ['ri'],
  category: 'utilities', 
  description: '<:arrows:1457808531678957784> View all information about a role.',
  async execute(message, args) {
    let role;
    if (!args[0]) {
      const member = await message.guild.members.fetch(message.author.id);
      role = member.roles.highest;
      if (!role) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription("<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You don't have any **roles**");
        return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
      }
    } else {
      const searchQuery = args.join(' ').toLowerCase();
      role = message.guild.roles.cache.find(r => 
        r.id === args[0] || 
        r.name.toLowerCase().includes(searchQuery)
      );
      
      if (!role) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Role not found, try a different **search term**.');
        return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
      }

      const allMatches = message.guild.roles.cache.filter(r => 
        r.name.toLowerCase().includes(searchQuery)
      );
      
      if (allMatches.size > 1 && !message.guild.roles.cache.has(args[0])) {
        const matchesEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setTitle('Multiple Roles Found')
          .setDescription(`Found ${allMatches.size} roles matching "${searchQuery}". Using the first match.\n\nFor exact matches, use the role ID.`)
          .addFields(
            { name: 'Matching Roles', value: allMatches.map(r => r.name).join(', ').slice(0, 1024) }
          );
        await message.reply({ embeds: [matchesEmbed], allowedMentions: { repliedUser: false } });
      }
    }

    try {
      const embed = new EmbedBuilder()
      .setColor(role.hexColor === '#000000' ? '#838996' : role.hexColor)
        .setTitle(`Role Info: ${role.name}`)
        .setThumbnail(role.iconURL({ dynamic: true }) || null)
        .addFields(
          { name: 'Role ID', value: `\`${role.id}\``, inline: true },
          { name: 'Guild', value: `${message.guild.name}\n\`(${message.guild.id})\``, inline: true },
          { name: 'Color', value: `${role.hexColor}${role.hexColor !== '#838996' ? `\n[Preview](${getColorImageURL(role.hexColor)})` : ''}`, inline: true },

          { name: 'Created At', value: `\`${role.createdAt.toUTCString()}\``, inline: true },
          { name: 'Position', value: `\`${role.position} (from bottom)\``, inline: true },
          { name: 'Members', value: `\`${role.members.size}\``, inline: true },

          { name: 'Hoisted', value: `\`${role.hoist ? 'Yes' : 'No'}\``, inline: true },
          { name: 'Mentionable', value: `\`${role.mentionable ? 'Yes' : 'No'}\``, inline: true }
        )
        .setFooter({
          text: `${message.author.tag}${!args[0] ? ' (your highest role)' : ''}`,
          iconURL: message.author.displayAvatarURL()
        });

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Error in roleinfo command:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while fetching role information.');
      await message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }
  }
};

function getColorImageURL(color) {
  const hex = color.replace('#', '');
  return `https://singlecolorimage.com/get/${hex}/200x200`;
}
