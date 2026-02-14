const { EmbedBuilder } = require('discord.js');
const { fetchGifAsAttachment } = require('./gifHelper');

// Direct GIF URLs (Giphy CDN) — fetched and attached so they always load
const KISS_GIFS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTRhbGMyeGNyYzJzMHF6cmx4aWVvbXhob3JuM2lmdmNuN3VtYzczYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jR22gdcPiOLaE/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXptN3FwenkxeDd5dmwwaXJpaTk3M28zenljb29yMGtwcmpncno2byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3T2sUzssrNNJK/giphy.gif',
  'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
  'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
  'https://media.giphy.com/media/FqBTvSNjNzeZG/giphy.gif'
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  name: 'kiss',
  aliases: [],
  category: 'fun',
  description: 'Kiss another user.',
  async execute(message, args, { prefix, getUser }) {
    const targetInput = args[0];
    if (!targetInput) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}kiss <user>\`\`\``,
              '-# <:arrows:1457808531678957784> Kiss someone.',
              '',
              `**Example:** \`${prefix}kiss @luca\``
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const target = await getUser(message, targetInput);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (target.id === message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot kiss yourself.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const authorName = message.author.displayName || message.author.username;
    const targetName = target.displayName || target.username;

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Kiss')
      .setDescription([
        `<@${message.author.id}> kissed <@${target.id}>!`,
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    const files = [];
    if (KISS_GIFS.length > 0) {
      const attachment = await fetchGifAsAttachment(shuffle(KISS_GIFS), 'kiss.gif');
      if (attachment) {
        files.push(attachment);
        embed.setImage('attachment://kiss.gif');
      }
    }

    return message.reply({ embeds: [embed], files, allowedMentions: { repliedUser: false } });
  }
};
