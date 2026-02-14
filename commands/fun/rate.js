const { EmbedBuilder } = require('discord.js');

const LINES = [
  'Absolutely unhinged. I respect it.',
  'This is fine. Everything is fine.',
  'I\'ve seen worse. Not much worse.',
  'The council has spoken.',
  'Certified moment.',
  'Would not recommend. 10/10 experience.',
  'Your parents are probably proud. Maybe.',
  'This is the energy we need in 2025.',
  'I have several questions. None of them good.',
  'Peak performance. Or something.',
  'Legendary. Questionably so.',
  'The bar was on the floor and you brought a shovel.',
  'Iconic. Derogatory.',
  'You\'re built different. I don\'t mean that as a compliment.',
  'This goes hard. Feel free to screenshot.',
  'Rare W. Cherish it.',
  'Unprecedented. Concerning.',
  'No notes. (I have notes. Many notes.)',
  'This is the one.',
  'Objectively correct. Subjectively unwell.'
];

module.exports = {
  name: 'rate',
  aliases: ['rating'],
  category: 'fun',
  description: 'Rate something or someone. Get a score and a verdict.',
  async execute(message, args, { prefix, getUser }) {
    let subject;
    let displayName;

    if (args.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}rate <thing or @user>\`\`\``,
              '-# <:arrows:1457808531678957784> Get a random score and verdict.',
              '',
              `**Examples:**`,
              `\`${prefix}rate my pfp\``,
              `\`${prefix}rate my life choices\``,
              `\`${prefix}rate @luca\``,
              '\n**Aliases:** `rating`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const mention = message.mentions.users.first();
    if (mention) {
      subject = mention.displayName || mention.username;
      displayName = `<@${mention.id}>`;
    } else {
      subject = args.join(' ');
      displayName = subject;
    }

    const score = Math.floor(Math.random() * 101);
    const line = LINES[Math.floor(Math.random() * LINES.length)];

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Rate')
      .setDescription([
        `<:leese:1457834970486800567> **Subject:** ${displayName}`,
        `<:tree:1457808523986731008> **Score:** **${score}/100**`,
        '',
        `-# ${line}`
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
