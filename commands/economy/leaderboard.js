const { EmbedBuilder } = require('discord.js');
const { db } = require('../../db');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'rich', 'top'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> View the richest users.',
  async execute(message, args, { prefix }) {
    // Get banned users from leaderboard
    const { dbHelpers } = require('../../db');
    const bannedUsers = dbHelpers.getLeaderboardBannedUsers();
    
    // Build query to exclude banned users
    let query = 'SELECT user_id, balance FROM economy_balances';
    const params = [];
    
    if (bannedUsers.size > 0) {
      const placeholders = Array.from(bannedUsers).map(() => '?').join(', ');
      query += ` WHERE user_id NOT IN (${placeholders})`;
      params.push(...Array.from(bannedUsers));
    }
    
    query += ' ORDER BY balance DESC LIMIT 10';
    
    // Get all balances from database (excluding banned users)
    const rows = db.prepare(query).all(...params);
    
    // Sort users by balance
    const sortedUsers = rows.map(row => [row.user_id, row.balance]);
    
    if (sortedUsers.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:arrows:1457808531678957784> No users have any coins yet. Be the first to earn some!')
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    // Fetch user info for top users
    const leaderboardEntries = [];
    for (let i = 0; i < sortedUsers.length; i++) {
      const [userId, balance] = sortedUsers[i];
      try {
        const user = await message.client.users.fetch(userId).catch(() => null);
        const username = user ? user.tag : 'Unknown User';
        const medal = i === 0 ? '🥇.' : i === 1 ? '🥈.' : i === 2 ? '🥉.' : `\`${i + 1}\`.`;
        leaderboardEntries.push(`> ${medal} <@${userId}> | **$${balance.toLocaleString()}**`);
      } catch (error) {
        leaderboardEntries.push(`\`${i + 1}\`. **Unknown User** | **$${balance.toLocaleString()}**`);
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:chest:1458071045251530773> **__Economy Leaderboard__**')
      .setDescription(leaderboardEntries.join('\n\n'))
      .addFields([
        { name: '', value: `-# <:arrows:1457808531678957784> Top **${sortedUsers.length}** richest users`, inline: false }
      ])
    
    return message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};

