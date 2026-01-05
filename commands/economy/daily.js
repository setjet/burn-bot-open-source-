const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const DAILY_REWARD_MIN = 100;
const DAILY_REWARD_MAX = 500;

module.exports = {
  name: 'daily',
  aliases: ['claim'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Claim your daily reward.',
  async execute(message, args, { prefix }) {
    const userId = message.author.id;
    const now = Date.now();
    
    const lastDaily = dbHelpers.getDailyCooldown(userId) || 0;
    const timeSinceDaily = now - lastDaily;
    
    if (timeSinceDaily < DAILY_COOLDOWN) {
      const remaining = DAILY_COOLDOWN - timeSinceDaily;
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:excl:1362858572677120252> <:arrows:1363099226375979058> You've already claimed your daily reward!`,
              `-# Come back in **${hours}h ${minutes}m**`
            ].join('\n'))
        ]
      });
    }
    
    const reward = Math.floor(Math.random() * (DAILY_REWARD_MAX - DAILY_REWARD_MIN + 1)) + DAILY_REWARD_MIN;
    
    // Add balance and update cooldown
    const newBalance = dbHelpers.addBalance(userId, reward);
    dbHelpers.setDailyCooldown(userId, now);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `💰 **Daily Reward Claimed!**`,
        '',
        `You received **${reward.toLocaleString()}** coins!`,
        '',
        `Your new balance: **${newBalance.toLocaleString()}** coins`
      ].join('\n'))
      .setFooter({ text: 'Come back in 24 hours for your next reward!' });
    
    return message.reply({ embeds: [embed] });
  }
};

