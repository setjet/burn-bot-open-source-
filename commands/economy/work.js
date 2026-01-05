const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

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

module.exports = {
  name: 'work',
  aliases: ['job'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Work to earn coins (1 hour cooldown).',
  async execute(message, args, { prefix }) {
    const userId = message.author.id;
    const now = Date.now();
    
    const lastWork = dbHelpers.getWorkCooldown(userId) || 0;
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
    
    // Add balance and update cooldown
    const newBalance = dbHelpers.addBalance(userId, reward);
    dbHelpers.setWorkCooldown(userId, now);
    
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

