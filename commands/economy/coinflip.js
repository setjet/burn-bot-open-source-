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
  name: 'coinflip',
  aliases: ['cf', 'flip'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Flip a coin and bet on heads or tails.',
  async execute(message, args, { prefix }) {
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}coinflip <heads/tails> <amount>\`\`\``,
              '-# <:arrows:1363099226375979058> Bet on heads or tails.',
              '',
              `**Examples:**`,
              `\`${prefix}coinflip heads 100\``,
              `\`${prefix}coinflip tails 500\``,
              '\n**Aliases:** `cf`, `flip`'
            ].join('\n'))
        ]
      });
    }
    
    const choice = args[0].toLowerCase();
    if (choice !== 'heads' && choice !== 'tails' && choice !== 'h' && choice !== 't') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please choose either **heads** or **tails**.`)
        ]
      });
    }
    
    const bet = parseInt(args[1]);
    if (isNaN(bet) || bet <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a valid bet amount greater than 0.`)
        ]
      });
    }
    
    const balance = getBalance(message.author.id);
    if (balance < bet) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:excl:1362858572677120252> <:arrows:1363099226375979058> You don't have enough coins!`,
              `-# Your balance: **${balance.toLocaleString()}** coins`
            ].join('\n'))
        ]
      });
    }
    
    // Normalize choice
    const normalizedChoice = (choice === 'h' || choice === 'heads') ? 'heads' : 'tails';
    
    // Flip coin
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = normalizedChoice === result;
    
    const data = getStoreData();
    if (!data.economy.balances[message.author.id]) data.economy.balances[message.author.id] = 0;
    
    if (won) {
      data.economy.balances[message.author.id] += bet;
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription([
          `🪙 **Coin Flip Result**`,
          '',
          `Coin landed on **${result}**!`,
          '',
          `<:check:1362850043333316659> You won **${bet.toLocaleString()}** coins!`,
          '',
          `Your new balance: **${data.economy.balances[message.author.id].toLocaleString()}** coins`
        ].join('\n'));
      saveStoreData(data);
      return message.reply({ embeds: [embed] });
    } else {
      data.economy.balances[message.author.id] -= bet;
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription([
          `🪙 **Coin Flip Result**`,
          '',
          `Coin landed on **${result}**!`,
          '',
          `<:excl:1362858572677120252> You lost **${bet.toLocaleString()}** coins.`,
          '',
          `Your new balance: **${data.economy.balances[message.author.id].toLocaleString()}** coins`
        ].join('\n'));
      saveStoreData(data);
      return message.reply({ embeds: [embed] });
    }
  }
};

