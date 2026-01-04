const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'serverinfo',
  aliases: ['si'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> View server information or check vanity URL status',
  async execute(message, args) {
    try {
      const input = args[0];
      
      // Helper function to display guild info
      const displayGuildInfo = async (guild) => {
        const owner = await guild.fetchOwner().catch(() => null);
        
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setTitle(`Server Info — ${guild.name}`)
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .addFields(
            { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
            { name: 'Owner', value: owner ? `<@${owner.id}>` : '**Not found**', inline: true },
            { name: 'Members', value: `\`${guild.memberCount}\``, inline: true },
            { name: 'Created On', value: `\`${guild.createdAt.toLocaleDateString()}\``, inline: true },
            { name: 'Region', value: `\`${guild.preferredLocale}\``, inline: true },
            { name: 'Verification Level', value: `\`${guild.verificationLevel}\``, inline: true },
            { name: 'Boost Level', value: `\`${guild.premiumTier}\``, inline: true },
            { name: 'Boost Count', value: `\`${guild.premiumSubscriptionCount}\``, inline: true },
            { name: 'Role Count', value: `\`${guild.roles.cache.size}\``, inline: true }
          )
          .setFooter({
            text: `${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          });

        return message.reply({ embeds: [embed] });
      };

      // If no args, show current server info
      if (!input) {
        return displayGuildInfo(message.guild);
      }

      // Check if input is a server ID (17-19 digit number)
      if (/^\d{17,19}$/.test(input)) {
        // Try to find the guild in bot's cache
        const guild = message.client.guilds.cache.get(input);
        
        if (guild) {
          return displayGuildInfo(guild);
        } else {
          // Bot is not in this server - try widget API
          const widgetUrl = `https://discord.com/api/v9/guilds/${input}/widget.json`;
          
          try {
            const widgetResponse = await axios.get(widgetUrl, {
              validateStatus: status => status < 500
            });
            
            if (widgetResponse.status === 200 && widgetResponse.data) {
              const widgetData = widgetResponse.data;
              
              // Calculate creation date from snowflake ID
              const createdAt = new Date(input / 4194304 + 1420070400000).toLocaleDateString();
              
              const embed = new EmbedBuilder()
                .setColor('#838996')
                .setTitle(`Server Info — ${widgetData.name}`)
                .addFields(
                  { name: 'Server ID', value: `\`${input}\``, inline: true },
                  { name: 'Members Online', value: `\`${widgetData.presence_count || 'N/A'}\``, inline: true },
                  { name: 'Created On', value: `\`${createdAt}\``, inline: true }
                )
                .setFooter({
                  text: `${message.author.tag} • Limited info (bot not in server)`,
                  iconURL: message.author.displayAvatarURL({ dynamic: true })
                });

              return message.reply({ embeds: [embed] });
            }
          } catch (err) {
            // Widget API failed, continue to show not found
          }
          
          // Could not fetch server info
          const embed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Could not fetch info** for server ID \`${input}\`\n`);

          return message.reply({ embeds: [embed] });
        }
      }

      // Otherwise, treat as vanity URL
      const vanity = input.toLowerCase();
      const apiUrl = `https://discord.com/api/v9/invites/${vanity}?with_counts=true&with_expiration=true`;

      const response = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: status => status < 500
      });

      if (response.status === 200 && response.data.guild) {
        // Vanity is claimed - show server info
        const guildData = response.data.guild;
        
        // Get owner ID from API response (when available)
        let ownerField = guildData.owner_id ? `<@${guildData.owner_id}>` : '`N/A`';
        
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setTitle(`Vanity Server Info — ${guildData.name}`)
          .setThumbnail(guildData.icon ? `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png` : null)
          .addFields(
            { name: 'Server ID', value: `\`${guildData.id}\``, inline: true },
            { name: 'Vanity URL', value: `\`discord.gg/${vanity}\``, inline: true },
            { name: 'Owner', value: ownerField, inline: true },
            { name: 'Members', value: `\`${guildData.approximate_member_count || 'N/A'}\``, inline: true },
            { name: 'Created On', value: `\`${new Date(guildData.id / 4194304 + 1420070400000).toLocaleDateString()}\``, inline: true },
            { name: 'Boost Level', value: `\`${guildData.premium_tier}\``, inline: true },
            { name: 'Boost Count', value: `\`${guildData.premium_subscription_count || 0}\``, inline: true }
          )
          .setFooter({
            text: `${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          });

        return message.reply({ embeds: [embed] });
      } else {
        // Vanity is available
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **No server** with the vanity \`/${vanity}\` was **found**`)

        return message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in serverinfo command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff4d4d')
        .setTitle('Error')
        .setDescription('An error occurred while processing your request.')
        
      return message.reply({ embeds: [errorEmbed] });
    }
  }
};