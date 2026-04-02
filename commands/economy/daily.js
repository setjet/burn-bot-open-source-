const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const DAILY_REWARD_MIN = 100;
const DAILY_REWARD_MAX = 500;

// timezone + cooldown math made me consider a career in farming 😭

module.exports = {
  name: 'daily',
  aliases: ['claim'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Claim your daily reward.',
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
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You've already **claimed** your **daily reward**!`,
              `-# <:tree:1457808523986731008> Come back <t:${Math.floor((now + (DAILY_COOLDOWN - timeSinceDaily)) / 1000)}:R>`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const reward = Math.floor(Math.random() * (DAILY_REWARD_MAX - DAILY_REWARD_MIN + 1)) + DAILY_REWARD_MIN;
    
    // Add balance and update cooldown
    const newBalance = dbHelpers.addBalance(userId, reward);
    dbHelpers.setDailyCooldown(userId, now);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        `<:chest:1458071045251530773> **__Daily Reward Claimed!__**`,
        '',
        `> You received **+$${reward.toLocaleString()}**`,
        '',
        `<:arrows:1457808531678957784> Your new balance: **\`$${newBalance.toLocaleString()}\`**`
      ].join('\n'))
    
    return message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};

