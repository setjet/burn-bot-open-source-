const { EmbedBuilder } = require('discord.js');
const { db } = require('../../db');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'rich', 'top'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> View the richest users.',
  async execute(message, args, { prefix }) {
    // Get all balances from database
    const rows = db.prepare('SELECT user_id, balance FROM economy_balances ORDER BY balance DESC LIMIT 10').all();
    
    // Sort users by balance
    const sortedUsers = rows.map(row => [row.user_id, row.balance]);
    
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

