const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../storedata.json');

const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '⭐', '💎', '7️⃣'];

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

function spin() {
  return [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];
}

function calculateWin(reels, bet) {
  const [a, b, c] = reels;
  
  // Three of a kind - Big wins
  if (a === b && b === c) {
    if (a === '💎') {
      // Diamond jackpot - randomize between 12x and 20x
      return Math.floor(bet * (12 + Math.random() * 8));
    }
    if (a === '7️⃣') {
      // Triple 7s - randomize between 8x and 12x
      return Math.floor(bet * (8 + Math.random() * 4));
    }
    if (a === '⭐') {
      // Triple stars - randomize between 5x and 8x
      return Math.floor(bet * (5 + Math.random() * 3));
    }
    // Triple fruits - randomize between 3x and 5x
    return Math.floor(bet * (3 + Math.random() * 2));
  }
  
  // Two of a kind - Small to medium wins
  if (a === b || b === c || a === c) {
    const matchSymbol = a === b ? a : (b === c ? b : a);
    // Special symbols give better multipliers
    if (matchSymbol === '💎' || matchSymbol === '7️⃣' || matchSymbol === '⭐') {
      // Small win with special symbols - randomize between 1.5x and 2.5x
      return Math.floor(bet * (1.5 + Math.random() * 1));
    }
    // Small win with fruits - randomize between 1.2x and 1.8x
    return Math.floor(bet * (1.2 + Math.random() * 0.6));
  }
  
  // No match - calculate loss amount (can lose small or big)
  const lossType = Math.random();
  if (lossType < 0.25) {
    // 25% chance to lose small (50-80% of bet) - near miss
    return -Math.floor(bet * (0.5 + Math.random() * 0.3));
  } else if (lossType < 0.75) {
    // 50% chance to lose full bet - normal loss
    return -bet;
  } else {
    // 25% chance to lose big (110-150% of bet) - bad spin
    return -Math.floor(bet * (1.1 + Math.random() * 0.4));
  }
}

module.exports = {
  name: 'slots',
  aliases: ['slot'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Play the slot machine.',
  async execute(message, args, { prefix }) {
    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}slots <bet amount>\`\`\``,
              '-# <:arrows:1363099226375979058> Play the slot machine.',
              '',
              `**Example:** \`${prefix}slots 100\``,
              '\n**Aliases:** `slot`'
            ].join('\n'))
        ]
      });
    }
    
    const bet = parseInt(args[0]);
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
    
    // Spin the slots
    const reels = spin();
    const result = calculateWin(reels, bet);
    
    const data = getStoreData();
    if (!data.economy.balances[message.author.id]) data.economy.balances[message.author.id] = 0;
    
    if (result > 0) {
      // Win scenario
      const netWin = result - bet; // Total win minus bet
      data.economy.balances[message.author.id] += netWin;
      
      // Determine win size for message
      let winMessage = '';
      if (result >= bet * 10) {
        winMessage = `🎉 **JACKPOT!** You won **${result.toLocaleString()}** coins!`;
      } else if (result >= bet * 5) {
        winMessage = `💰 **Big Win!** You won **${result.toLocaleString()}** coins!`;
      } else if (result >= bet * 2) {
        winMessage = `💵 **Nice Win!** You won **${result.toLocaleString()}** coins!`;
      } else {
        winMessage = `💸 **Small Win!** You won **${result.toLocaleString()}** coins!`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTitle('🎰 Slots')
        .setDescription([
          `**${reels[0]} | ${reels[1]} | ${reels[2]}**`,
          '',
          `<:check:1362850043333316659> ${winMessage}`,
          `Net gain: **+${netWin.toLocaleString()}** coins`,
          '',
          `Your new balance: **${data.economy.balances[message.author.id].toLocaleString()}** coins`
        ].join('\n'));
      saveStoreData(data);
      return message.reply({ embeds: [embed] });
    } else {
      // Loss scenario
      const lossAmount = Math.abs(result); // Convert negative to positive
      data.economy.balances[message.author.id] -= lossAmount;
      
      // Determine loss size for message
      let lossMessage = '';
      if (lossAmount >= bet * 0.8) {
        lossMessage = `💔 **Big Loss!** You lost **${lossAmount.toLocaleString()}** coins.`;
      } else if (lossAmount >= bet * 0.5) {
        lossMessage = `😞 **Medium Loss!** You lost **${lossAmount.toLocaleString()}** coins.`;
      } else {
        lossMessage = `😕 **Small Loss!** You lost **${lossAmount.toLocaleString()}** coins.`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTitle('🎰 Slots')
        .setDescription([
          `**${reels[0]} | ${reels[1]} | ${reels[2]}**`,
          '',
          `<:excl:1362858572677120252> ${lossMessage}`,
          '',
          `Your new balance: **${data.economy.balances[message.author.id].toLocaleString()}** coins`
        ].join('\n'));
      saveStoreData(data);
      return message.reply({ embeds: [embed] });
    }
  }
};

