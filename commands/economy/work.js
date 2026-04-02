const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour
const WORK_REWARD_MIN = 50;
const WORK_REWARD_MAX = 200;

// job strings took longer to write than the economy schema 😭

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
  description: '<:arrows:1457808531678957784> Work to earn money (1 hour cooldown).',
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
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You're still tired from working!`,
              `-# <:tree:1457808523986731008> Come back in <t:${Math.floor((now + (WORK_COOLDOWN - timeSinceWork)) / 1000)}:R>`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const reward = Math.floor(Math.random() * (WORK_REWARD_MAX - WORK_REWARD_MIN + 1)) + WORK_REWARD_MIN;
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    
    // Add balance and update cooldown
    const newBalance = dbHelpers.addBalance(userId, reward);
    dbHelpers.setWorkCooldown(userId, now);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        `<:work:1458109309975007437> **__Work Complete__**`,
        '',
        `> You **${job}** and earned **+$${reward.toLocaleString()}**!`,
        `-# <:tree:1457808523986731008> Your new balance: **\`$${newBalance.toLocaleString()}\`**`
      ].join('\n'))
    
    return message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};

