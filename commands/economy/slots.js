const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

const symbols = ['\`🍒\`', '\`🍋\`', '\`🍊\`', '\`🍇\`', '\`🍉\`', '\`⭐\`', '\`💎\`', '\`7️⃣\`'];

// payout table tuning: 10% fun, 90% "why is house always winning" 😭

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
  description: '<:arrows:1457808531678957784> Play the slot machine.',
  async execute(message, args, { prefix }) {
    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}slots <amount>\`\`\``,
              '-# <:arrows:1457808531678957784> Play the slot machine.',
              '',
              `**Example:** \`${prefix}slots 100\``,
              '\n**Aliases:** `slot`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a **valid bet amount** greater than **0**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const balance = dbHelpers.getBalance(message.author.id);
    if (balance < bet) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You don't have enough **money**!`,
              `-# <:tree:1457808523986731008> Your balance: **\`$${balance.toLocaleString()}\`**`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    // Spin the slots
    const reels = spin();
    const result = calculateWin(reels, bet);
    
    if (result > 0) {
      // Win scenario
      const netWin = result - bet; // Total win minus bet
      const newBalance = dbHelpers.addBalance(message.author.id, netWin);
      
      // Determine win size for message
      let winMessage = '';
      if (result >= bet * 10) {
        winMessage = `**JACKPOT!** You won **$${result.toLocaleString()}**`;
      } else if (result >= bet * 5) {
        winMessage = `**Big Win!** You won **$${result.toLocaleString()}**`;
      } else if (result >= bet * 2) {
        winMessage = `**Nice Win!** You won **$${result.toLocaleString()}**`;
      } else {
        winMessage = `**Small Win!** You won **$${result.toLocaleString()}**`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:slots:1458101131938103461> __Slots__')
        .setDescription([
          `**\`${reels[0]}\` | \`${reels[1]}\` | \`${reels[2]}\`**`,
          '',
          `> ${winMessage}`,
          `-# <:leese:1457834970486800567> Net gain: **+$${netWin.toLocaleString()}**`,
          `-# <:tree:1457808523986731008> Your new balance: **\`$${newBalance.toLocaleString()}\`**`
        ].join('\n'));
      return message.reply({ 
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    } else {
      // Loss scenario
      const lossAmount = Math.abs(result); // Convert negative to positive
      const netLoss = lossAmount; // Per-spin loss (same as lossAmount for this spin)
      const newBalance = dbHelpers.addBalance(message.author.id, -lossAmount);
      
      // Determine loss size for message
      let lossMessage = '';
      if (lossAmount >= bet * 0.8) {
        lossMessage = `**Big Loss!** You lost **$${lossAmount.toLocaleString()}**`;
      } else if (lossAmount >= bet * 0.5) {
        lossMessage = `**Medium Loss!** You lost **$${lossAmount.toLocaleString()}**`;
      } else {
        lossMessage = `**Small Loss!** You lost **$${lossAmount.toLocaleString()}**`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:slots:1458101131938103461> __Slots__')
        .setDescription([
          `**\`${reels[0]}\` | \`${reels[1]}\` | \`${reels[2]}\`**`,
          '',
          `> ${lossMessage}`,
          `-# <:leese:1457834970486800567> Net loss: **-$${netLoss.toLocaleString()}**`,
          `-# <:tree:1457808523986731008> Your new balance: **\`$${newBalance.toLocaleString()}\`**`
        ].join('\n'));
      return message.reply({ 
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};

