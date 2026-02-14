const { EmbedBuilder } = require('discord.js');
const { fetchGifAsAttachment } = require('./gifHelper');

// Direct GIF URLs (Giphy CDN) — fetched and attached so they always load
const HUG_GIFS = [
  'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmtrNXV6Y2xma21uc2NkaGFsNW5xazNuOWdoeDV5dTdza3htc3A2NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IzXiddo2twMmdmU8Lv/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTdkZDRydGw2N3BwaDR4eWNnanZqc2p3d3h2emxraW1obGRrOXBqaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ABjJcFelbuanC/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3am1ocjE3YWxndTRldmMzY2QwcDZzZ2tyczUzM214cHoycGp0d3VvNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RJEIl2fBX3jAJOqSau/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dDhpeXlybjB2Zzd6ZXg1cG10aWhjYjI1MDR6b2gyMWI2Z2w1dHpobiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QFPoctlgZ5s0E/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cjZ5bmxtbGhvcTVreG81b2Vqb2E4eWlrZm9kbHRjYzRzcm00eGI2dyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IRUb7GTCaPU8E/giphy.gif'
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
  name: 'hug',
  aliases: [],
  category: 'fun',
  description: 'Hug another user.',
  async execute(message, args, { prefix, getUser }) {
    const targetInput = args[0];
    if (!targetInput) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}hug <user>\`\`\``,
              '-# <:arrows:1457808531678957784> Hug someone.',
              '',
              `**Example:** \`${prefix}hug @luca\``
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
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot hug yourself. (Or can you? 🤔)')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const authorName = message.author.displayName || message.author.username;
    const targetName = target.displayName || target.username;

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Hug')
      .setDescription([
        `<@${message.author.id}> hugged <@${target.id}>!`,
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    const files = [];
    if (HUG_GIFS.length > 0) {
      const attachment = await fetchGifAsAttachment(shuffle(HUG_GIFS), 'hug.gif');
      if (attachment) {
        files.push(attachment);
        embed.setImage('attachment://hug.gif');
      }
    }

    return message.reply({ embeds: [embed], files, allowedMentions: { repliedUser: false } });
  }
};
