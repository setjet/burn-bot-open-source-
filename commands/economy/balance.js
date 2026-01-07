const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'balance',
  aliases: ['bal', 'money', 'wallet'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Check your or another user\'s balance.',
  async execute(message, args, { prefix }) {
    // Command only works in servers
    if (!message.guild) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> This command can only be used in a server.`)
        ],
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
    
    let targetUser = message.author;
    
    if (args.length > 0) {
      const userInput = args[0];
      
      // Try to get user from mention first
      const mention = message.mentions.users.first();
      if (mention) {
        targetUser = mention;
      } else if (/^\d{17,19}$/.test(userInput)) {
        // Try to fetch by ID (works globally for any Discord user)
        try {
          targetUser = await message.client.users.fetch(userInput);
        } catch (error) {
          if (error.code === 10013) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User with ID \`${userInput}\` not found.`)
              ],
              allowedMentions: { repliedUser: false }
            }).catch(() => {});
          }
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Could not fetch user.`)
            ],
            allowedMentions: { repliedUser: false }
          }).catch(() => {});
        }
      } else {
        // Try to find by username, display name, or nickname in the server
        // Search in cache first (avoids rate limits)
        let member = message.guild.members.cache.find(m => 
          m.user.username.toLowerCase() === userInput.toLowerCase() ||
          m.user.tag.toLowerCase() === userInput.toLowerCase() ||
          (m.nickname && m.nickname.toLowerCase() === userInput.toLowerCase()) ||
          m.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
          (m.nickname && m.nickname.toLowerCase().includes(userInput.toLowerCase()))
        );
        
        if (member) {
          targetUser = member.user;
        } else {
          // Try fetching all members and searching (may cause rate limits but more reliable)
          try {
            const members = await message.guild.members.fetch().catch(() => null);
            if (members) {
              member = members.find(m => 
                m.user.username.toLowerCase() === userInput.toLowerCase() ||
                m.user.tag.toLowerCase() === userInput.toLowerCase() ||
                (m.nickname && m.nickname.toLowerCase() === userInput.toLowerCase()) ||
                m.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
                (m.nickname && m.nickname.toLowerCase().includes(userInput.toLowerCase()))
              );
              if (member) {
                targetUser = member.user;
              }
            }
          } catch (error) {
            // Fetch failed, continue to error message
          }
          
          if (!member) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${userInput}\` not found in this server.\n-# Try using a **mention** (\`@user\`) or **user ID** for global search.`)
              ],
              allowedMentions: { repliedUser: false }
            }).catch(() => {});
          }
        }
      }
    }
    
    const balance = dbHelpers.getBalance(targetUser.id);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        `<:money:1457943917671612561> **<@${targetUser.id}>'s Balance**`,
        `\n > \`$${balance.toLocaleString()}\`\n\n-# follow **[tos](https://discord.com/terms)** and **[gl](https://discord.com/guidelines)**`
      ].join('\n'));
    
    // Only set footer if viewing someone else's balance
    
    return message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};

