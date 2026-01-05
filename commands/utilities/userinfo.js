const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  category: 'utilities', 
  description: '<:arrows:1363099226375979058> View information about a user.',
  async execute(message, args, { getUser }) {
    try {
      // Resolve target user from args, mention, or default to author
      let targetUser = message.author;
      
      if (args[0]) {
        // Try to get user from mention first (works globally if user is in any shared server)
        const mention = message.mentions.users.first();
        if (mention) {
          targetUser = mention;
        } else if (/^\d{17,19}$/.test(args[0])) {
          // Try to fetch by ID (works globally for any Discord user)
          try {
            targetUser = await message.client.users.fetch(args[0]);
          } catch (error) {
            if (error.code === 10013) {
              const errorEmbed = new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User with ID \`${args[0]}\` not found.`);
              return message.reply({ embeds: [errorEmbed] }).catch(() => {});
            }
            throw error;
          }
        } else {
          // Try to find by username - search in current server first, then try global methods
          let found = false;
          
          if (message.guild) {
            // Search in current server cache first (avoids rate limits)
            const member = message.guild.members.cache.find(m => 
              m.user.username.toLowerCase() === args[0].toLowerCase() ||
              m.user.tag.toLowerCase() === args[0].toLowerCase() ||
              (m.nickname && m.nickname.toLowerCase() === args[0].toLowerCase())
            );
            
            if (member) {
              targetUser = member.user;
              found = true;
            } else {
              // Try using getUser helper (searches in server, may fetch all members)
              try {
                const foundUser = await getUser(message, args[0]);
                if (foundUser && foundUser.id !== message.author.id) {
                  targetUser = foundUser;
                  found = true;
                }
              } catch (error) {
                // getUser failed, continue
              }
            }
          }
          
          // If not found in server, try to fetch globally by attempting to parse as potential ID
          // or suggest using ID/mention for global search
          if (!found) {
            // Try one more time - maybe it's a username that needs to be fetched differently
            // But Discord API doesn't support global username search, so we can only search in shared servers
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> user \`${args[0]}\` not found in this server\n-# Try using their **user ID** which works globally`)
            return message.reply({ embeds: [errorEmbed] }).catch(() => {});
          }
        }
      }

      if (!targetUser) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Could not find user.`);
        return message.reply({ embeds: [errorEmbed] }).catch(() => {});
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
                .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Rate limited. Please try again in a few seconds.');
              return message.reply({ embeds: [errorEmbed] }).catch(() => {});
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

      await message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error('Error in userinfo command:', error);
      
      let errorMessage = '<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while displaying user information.';
      
      if (error.code === 50035 || error.message?.includes('rate limit')) {
        errorMessage = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Rate limited. Please try again in a few seconds.';
      } else if (error.code === 10013) {
        errorMessage = '<:excl:1362858572677120252> <:arrows:1363099226375979058> User not found.';
      }
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorMessage);
      
      await message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
  }
};
