const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../storedata.json');
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const DAILY_REWARD_MIN = 100;
const DAILY_REWARD_MAX = 500;

function getStoreData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (!data.economy) data.economy = { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} };
      if (!data.economy.balances) data.economy.balances = {};
      if (!data.economy.dailyCooldowns) data.economy.dailyCooldowns = {};
      return data;
    }
  } catch (error) {
    console.error('Error reading storedata.json:', error);
  }
  return { economy: { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} } };
}

function saveStoreData(data) {
  try {
    let existingData = {};
    if (fs.existsSync(dataFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      } catch (e) {}
    }
    // Deep merge economy object
    if (data.economy) {
      if (!existingData.economy) existingData.economy = { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} };
      existingData.economy = {
        ...existingData.economy,
        ...data.economy,
        balances: { ...existingData.economy.balances, ...(data.economy.balances || {}) },
        dailyCooldowns: { ...existingData.economy.dailyCooldowns, ...(data.economy.dailyCooldowns || {}) },
        workCooldowns: { ...existingData.economy.workCooldowns, ...(data.economy.workCooldowns || {}) },
        shopItems: { ...existingData.economy.shopItems, ...(data.economy.shopItems || {}) }
      };
    }
    const mergedData = { ...existingData, ...data };
    if (data.economy) mergedData.economy = existingData.economy;
    fs.writeFileSync(dataFile, JSON.stringify(mergedData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving storedata.json:', error);
  }
}

function addBalance(userId, amount) {
  const data = getStoreData();
  if (!data.economy.balances[userId]) data.economy.balances[userId] = 0;
  data.economy.balances[userId] += amount;
  saveStoreData(data);
  return data.economy.balances[userId];
}

module.exports = {
  name: 'daily',
  aliases: ['claim'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Claim your daily reward.',
  async execute(message, args, { prefix }) {
    const data = getStoreData();
    const userId = message.author.id;
    const now = Date.now();
    
    const lastDaily = data.economy.dailyCooldowns[userId] || 0;
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
    
    // Add balance and get updated data
    const newBalance = addBalance(userId, reward);
    
    // Update cooldown with fresh data to ensure balance is preserved
    const updatedData = getStoreData();
    updatedData.economy.dailyCooldowns[userId] = now;
    saveStoreData(updatedData);
    
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

