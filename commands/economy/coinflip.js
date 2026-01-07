const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'coinflip',
  aliases: ['cf', 'flip'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Flip a coin and bet on heads or tails.',
  async execute(message, args, { prefix }) {
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}coinflip <heads/tails> <amount>\`\`\``,
              '-# <:arrows:1457808531678957784> Bet on **heads** or **tails**',
              '',
              `**Examples:**`,
              `\`${prefix}coinflip heads 100`,
              `${prefix}coinflip tails 500\``,
              '\n**Aliases:** `cf`, `flip`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const choice = args[0].toLowerCase();
    if (choice !== 'heads' && choice !== 'tails' && choice !== 'h' && choice !== 't') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please choose either **heads** or **tails**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const bet = parseInt(args[1]);
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
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You don't have enough money!`,
              `-# <:tree:1457808523986731008> Your balance: **$${balance.toLocaleString()}**`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    // Normalize choice
    const normalizedChoice = (choice === 'h' || choice === 'heads') ? 'heads' : 'tails';
    
    // Send loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<a:loading:1458064376165564577> **Flipping coin...**');
    
    const loadingMessage = await message.reply({ 
      embeds: [loadingEmbed],
      allowedMentions: { repliedUser: false }
    });
    
    // Wait a bit for suspense
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Flip coin
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = normalizedChoice === result;
    
    if (won) {
      const newBalance = dbHelpers.addBalance(message.author.id, bet);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          `<:c0in:1458065333289095313> **__Coin Flipped__**`,
          '',
          `> Coin landed on **${result}**, You won **$${bet.toLocaleString()}**`,
          '',
          `-# <:arrows:1457808531678957784> Your new balance: **\`$${newBalance.toLocaleString()}\`**`
        ].join('\n'));
      return loadingMessage.edit({ embeds: [embed] });
    } else {
      const newBalance = dbHelpers.addBalance(message.author.id, -bet);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
         `<:c0in:1458065333289095313> **__Coin Flipped__**`,
          '',
          `> Coin landed on **${result}**, You Lost **$${bet.toLocaleString()}**`,
          '',
          `-# <:arrows:1457808531678957784> Your new balance: **\`$${newBalance.toLocaleString()}\`**`
        ].join('\n'));
      return loadingMessage.edit({ embeds: [embed] });
    }
  }
};

