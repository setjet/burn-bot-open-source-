const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../storedata.json');

function getBalance(userId) {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      return (data.economy?.balances?.[userId] || 0);
    }
  } catch (error) {
    console.error('Error reading balance:', error);
  }
  return 0;
}

module.exports = {
  name: 'balance',
  aliases: ['bal', 'money', 'wallet'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Check your or another user\'s balance.',
  async execute(message, args, { prefix }) {
    let targetUser = message.author;
    
    if (args.length > 0) {
      const userInput = args[0];
      let userId;
      
      if (userInput.startsWith('<@') && userInput.endsWith('>')) {
        userId = userInput.slice(2, -1).replace('!', '');
      } else if (/^\d{17,19}$/.test(userInput)) {
        userId = userInput;
      } else {
        // Try to find by username
        const member = message.guild.members.cache.find(m => 
          m.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
          m.displayName.toLowerCase().includes(userInput.toLowerCase())
        );
        if (member) {
          targetUser = member.user;
        } else {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${userInput}\` not found.`)
            ]
          });
        }
      }
      
      if (userId) {
        try {
          targetUser = await message.client.users.fetch(userId);
        } catch (error) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User not found.`)
            ]
          });
        }
      }
    }
    
    const balance = getBalance(targetUser.id);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `💰 **Balance**`,
        `\`${balance.toLocaleString()}\` coins`
      ].join('\n'))
      .setFooter({ text: targetUser.id === message.author.id ? 'Your balance' : `${targetUser.username}'s balance` });
    
    return message.reply({ embeds: [embed] });
  }
};

