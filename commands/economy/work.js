const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../storedata.json');
const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour
const WORK_REWARD_MIN = 50;
const WORK_REWARD_MAX = 200;

const jobs = [
  'worked as a developer',
  'delivered packages',
  'worked at a restaurant',
  'did freelance work',
  'worked as a cashier',
  'cleaned offices',
  'worked at a store',
  'did yard work',
  'worked as a tutor',
  'did data entry'
];

function getStoreData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (!data.economy) data.economy = { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} };
      if (!data.economy.balances) data.economy.balances = {};
      if (!data.economy.workCooldowns) data.economy.workCooldowns = {};
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
  name: 'work',
  aliases: ['job'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Work to earn coins (1 hour cooldown).',
  async execute(message, args, { prefix }) {
    const data = getStoreData();
    const userId = message.author.id;
    const now = Date.now();
    
    const lastWork = data.economy.workCooldowns[userId] || 0;
    const timeSinceWork = now - lastWork;
    
    if (timeSinceWork < WORK_COOLDOWN) {
      const remaining = WORK_COOLDOWN - timeSinceWork;
      const minutes = Math.floor(remaining / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:excl:1362858572677120252> <:arrows:1363099226375979058> You're still tired from working!`,
              `-# Come back in **${minutes}m ${seconds}s**`
            ].join('\n'))
        ]
      });
    }
    
    const reward = Math.floor(Math.random() * (WORK_REWARD_MAX - WORK_REWARD_MIN + 1)) + WORK_REWARD_MIN;
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    
    // Add balance and get updated data
    const newBalance = addBalance(userId, reward);
    
    // Update cooldown with fresh data to ensure balance is preserved
    const updatedData = getStoreData();
    updatedData.economy.workCooldowns[userId] = now;
    saveStoreData(updatedData);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `💼 **Work Complete**`,
        '',
        `You ${job} and earned **${reward.toLocaleString()}** coins!`,
        '',
        `Your new balance: **${newBalance.toLocaleString()}** coins`
      ].join('\n'))
      .setFooter({ text: 'Come back in 1 hour to work again!' });
    
    return message.reply({ embeds: [embed] });
  }
};

