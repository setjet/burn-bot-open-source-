const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

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
    const targetBalance = dbHelpers.getBalance(target.id);
    
    dbHelpers.setBalance(message.author.id, senderBalance - amount);
    dbHelpers.setBalance(target.id, targetBalance + amount);
    
    const newSenderBalance = dbHelpers.getBalance(message.author.id);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `<:check:1362850043333316659> <:arrows:1363099226375979058> **Payment Sent**`,
        '',
        `Sent \`${amount.toLocaleString()}\` coins to <@${target.id}>`,
        '',
        `Your new balance: **${newSenderBalance.toLocaleString()}** coins`
      ].join('\n'));
    
    return message.reply({ embeds: [embed] });
  }
};

