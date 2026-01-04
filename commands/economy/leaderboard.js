const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../storedata.json');

function getStoreData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (!data.economy) data.economy = { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} };
      if (!data.economy.balances) data.economy.balances = {};
      return data;
    }
  } catch (error) {
    console.error('Error reading storedata.json:', error);
  }
  return { economy: { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} } };
}

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'rich', 'top'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> View the richest users.',
  async execute(message, args, { prefix }) {
    const data = getStoreData();
    const balances = data.economy.balances || {};
    
    // Sort users by balance
    const sortedUsers = Object.entries(balances)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedUsers.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:arrows:1363099226375979058> No users have any coins yet. Be the first to earn some!')
        ]
      });
    }
    
    // Fetch user info for top users
    const leaderboardEntries = [];
    for (let i = 0; i < sortedUsers.length; i++) {
      const [userId, balance] = sortedUsers[i];
      try {
        const user = await message.client.users.fetch(userId).catch(() => null);
        const username = user ? user.tag : 'Unknown User';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        leaderboardEntries.push(`${medal} **${username}** - \`${balance.toLocaleString()}\` coins`);
      } catch (error) {
        leaderboardEntries.push(`${i + 1}. **Unknown User** - \`${balance.toLocaleString()}\` coins`);
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('💰 Economy Leaderboard')
      .setDescription(leaderboardEntries.join('\n\n'))
      .setFooter({ text: `Top ${sortedUsers.length} richest users` })
    
    return message.reply({ embeds: [embed] });
  }
};

