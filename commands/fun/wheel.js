const { EmbedBuilder } = require('discord.js');
const { fetchGifAsAttachment } = require('./gifHelper');

// Spinning wheel GIFs (Giphy — returns real GIF bytes so fetch + attach works)
const SPIN_GIF_URLS = [
  'https://media.giphy.com/media/dmcZmlSqxw074fB8z5/giphy.gif',
  'https://media.giphy.com/media/kgIh7J3C04Ppt2Dkq5/giphy.gif',
  'https://media.giphy.com/media/3o7TKsBXQz3ozl2q2c/giphy.gif',
  'https://media.giphy.com/media/l0MYqvdVlLh2OeS2c/giphy.gif'
];

const SPIN_DURATION_MS = 3500; // tuned by vibes; 2s felt rushed, 5s felt like a loading screen 😭

module.exports = {
  name: 'wheel',
  aliases: ['spin', 'spinwheel'],
  category: 'fun',
  description: 'Spin the wheel. Separate options with | or commas.',
  async execute(message, args, { prefix }) {
    const input = args.join(' ').trim();
    if (!input) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}wheel <option1> | <option2> | <option3> ...\`\`\``,
              '-# <:arrows:1457808531678957784> Spin the wheel; bot picks one option at random.',
              '',
              `**Example:** \`${prefix}wheel Pizza | Pasta | Sushi\``,
              `**Example:** \`${prefix}wheel Luca, Sarah, Alex\``,
              '\n**Aliases:** `spin`, `spinwheel`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const options = input.split(/\s*\|\s*|\s*,\s*/).map(s => s.trim()).filter(Boolean);
    if (options.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Give at least **2 options** (use **|** or **,** between them).')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const winner = options[Math.floor(Math.random() * options.length)];

    const spinningEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Wheel')
      .setDescription([
        '<:leese:1457834970486800567> **Options:** ' + options.join(', '),
        '',
        '<:tree:1457808523986731008> Spinning the wheel...',
        '',
        '-# 🎡'
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    const spinAttachment = await fetchGifAsAttachment(SPIN_GIF_URLS, 'wheel.gif');
    if (spinAttachment) {
      spinningEmbed.setImage('attachment://wheel.gif');
    } else {
      spinningEmbed.setImage(SPIN_GIF_URLS[0]);
    }

    const files = spinAttachment ? [spinAttachment] : [];
    const sent = await message.reply({
      embeds: [spinningEmbed],
      files,
      allowedMentions: { repliedUser: false }
    });

    const resultEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Wheel')
      .setDescription([
        '<:leese:1457834970486800567> **Options:** ' + options.join(', '),
        '',
        '<:tree:1457808523986731008> **The wheel landed on:** **' + winner + '**',
        '',
        '-# 🎡'
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    setTimeout(() => {
      sent.edit({ embeds: [resultEmbed], files: [] }).catch(() => {});
    }, SPIN_DURATION_MS);
  }
};
