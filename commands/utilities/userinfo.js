const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  category: 'utilities', 
  description: '<:arrows:1457808531678957784> View information about a user.',
  async execute(message, args, { getUser }) {
    try {
      // Resolve target user from args, mention, or default to author
      let targetUser = message.author;
      
      if (args[0]) {
        // Use getUser helper which handles mentions, IDs, usernames, display names, etc.
        try {
          const foundUser = await getUser(message, args[0]);
          if (foundUser) {
            targetUser = foundUser;
          } else {
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${args[0]}\` not found.\n-# Try using their **user ID** or **mention** for better results.`);
            return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
          }
        } catch (error) {
          if (error.code === 10013) {
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User with ID \`${args[0]}\` not found.`);
            return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
          }
          throw error;
        }
      }

      if (!targetUser) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Could not find user.`);
        return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      // Get member info if in a guild (use cache first to avoid rate limits)
      let member = null;
      if (message.guild) {
        // Try cache first
        member = message.guild.members.cache.get(targetUser.id);
        
        // If not in cache, try fetching (with rate limit handling)
        if (!member) {
          try {
            member = await message.guild.members.fetch(targetUser.id).catch(() => null);
          } catch (error) {
            if (error.code === 50035 || error.message?.includes('rate limit')) {
              const errorEmbed = new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Rate limited. Please try again in a few seconds.');
              return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
            }
            // If user is not in server, member will be null - that's okay
            member = null;
          }
        }
      }

      // Build embed
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setAuthor({ name: `${targetUser.tag}'s Info`, iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 256 }) })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
          { name: 'Account Created', value: targetUser.createdAt.toLocaleDateString(), inline: true },
          ...(member
            ? [
                { name: 'Server Joined', value: member.joinedAt.toLocaleDateString(), inline: true },
                {
                  name: `Roles [${member.roles.cache.filter(r => r.id !== message.guild.id).size}]`,
                  value: member.roles.cache
                    .filter(role => role.id !== message.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 20)
                    .join(' ') || 'None',
                  inline: false
                },
                { name: 'Highest Role', value: member.roles.highest.id !== message.guild.id ? member.roles.highest.toString() : 'None', inline: true },
                { name: 'Nickname', value: member.nickname || 'None', inline: true },
                { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true }
              ]
            : [
                { name: 'Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true }
              ])
        )
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    } catch (error) {
      console.error('Error in userinfo command:', error);
      
      let errorMessage = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while displaying user information.';
      
      if (error.code === 50035 || error.message?.includes('rate limit')) {
        errorMessage = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Rate limited. Please try again in a few seconds.';
      } else if (error.code === 10013) {
        errorMessage = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found.';
      }
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorMessage);
      
      await message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }
  }
};
