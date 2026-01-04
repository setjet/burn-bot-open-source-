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

function getBalance(userId) {
  const data = getStoreData();
  return data.economy.balances[userId] || 0;
}

function setBalance(userId, amount) {
  const data = getStoreData();
  data.economy.balances[userId] = amount;
  saveStoreData(data);
}

module.exports = {
  name: 'pay',
  aliases: ['transfer', 'give'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Send money to another user.',
  async execute(message, args, { prefix, getUser }) {
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}pay <user> <amount>\`\`\``,
              '-# <:arrows:1363099226375979058> Send coins to another user.',
              '',
              `**Example:** \`${prefix}pay @user 1000\``,
              '\n**Aliases:** `transfer`, `give`'
            ].join('\n'))
        ]
      });
    }
    
    const target = await getUser(message, args[0]);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`)
        ]
      });
    }
    
    if (target.id === message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> You can't pay yourself.`)
        ]
      });
    }
    
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a valid amount greater than 0.`)
        ]
      });
    }
    
    const senderBalance = getBalance(message.author.id);
    if (senderBalance < amount) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:excl:1362858572677120252> <:arrows:1363099226375979058> You don't have enough coins!`,
              `-# Your balance: **${senderBalance.toLocaleString()}** coins`
            ].join('\n'))
        ]
      });
    }
    
    // Transfer money
    const data = getStoreData();
    if (!data.economy.balances[message.author.id]) data.economy.balances[message.author.id] = 0;
    if (!data.economy.balances[target.id]) data.economy.balances[target.id] = 0;
    
    data.economy.balances[message.author.id] -= amount;
    data.economy.balances[target.id] += amount;
    saveStoreData(data);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `<:check:1362850043333316659> <:arrows:1363099226375979058> **Payment Sent**`,
        '',
        `Sent \`${amount.toLocaleString()}\` coins to <@${target.id}>`,
        '',
        `Your new balance: **${data.economy.balances[message.author.id].toLocaleString()}** coins`
      ].join('\n'));
    
    return message.reply({ embeds: [embed] });
  }
};

