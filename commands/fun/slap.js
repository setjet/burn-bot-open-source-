const { EmbedBuilder } = require('discord.js');
const { fetchGifAsAttachment } = require('./gifHelper');

// Direct GIF URLs (Giphy CDN) — fetched and attached so they always load
const SLAP_GIFS = [
  'https://media.giphy.com/media/GAZzjsPrMZmBW/giphy.gif',
  'https://media.giphy.com/media/83bGzE1mKEpXO/giphy.gif',
  'https://media.giphy.com/media/VgIOYh6cC9Rvi/giphy.gif',
  'https://media.giphy.com/media/Zau0yrl7uAeBS/giphy.gif',
  'https://media.giphy.com/media/jLeyZWgtwgr2U/giphy.gif'
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
  name: 'slap',
  aliases: [],
  category: 'fun',
  description: 'Slap another user.',
  async execute(message, args, { prefix, getUser }) {
    const targetInput = args[0];
    if (!targetInput) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}slap <user>\`\`\``,
              '-# <:arrows:1457808531678957784> Slap someone.',
              '',
              `**Example:** \`${prefix}slap @luca\``
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
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot slap yourself.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const authorName = message.author.displayName || message.author.username;
    const targetName = target.displayName || target.username;

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Slap')
      .setDescription([
        `<@${message.author.id}> slapped <@${target.id}>!`,
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    const files = [];
    if (SLAP_GIFS.length > 0) {
      const attachment = await fetchGifAsAttachment(shuffle(SLAP_GIFS), 'slap.gif');
      if (attachment) {
        files.push(attachment);
        embed.setImage('attachment://slap.gif');
      }
    }

    return message.reply({ embeds: [embed], files, allowedMentions: { repliedUser: false } });
  }
};
