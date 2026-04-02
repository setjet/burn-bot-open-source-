const { EmbedBuilder } = require('discord.js');

// user limit 0 vs 99 vs "infinity" — semantics hurt 😭

module.exports = {
  name: 'limit',
  async execute(message, args, { prefix, voiceChannel, channelData, db }) {
    const raw = args[1];
    if (raw === undefined || raw === '') {
      const current = channelData.userLimit || 'None';
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}voicemaster limit <0-99>\`\`\``,
          '-# <:arrows:1457808531678957784> Sets max users in your voice channel (0 = no limit).',
          '',
          '**Current limit:** ' + current
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 0 || num > 99) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Limit must be between **0** and **99** (0 = no limit).');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    await voiceChannel.setUserLimit(num).catch(() => {});
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, userLimit: num });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> User limit set to **' + (num === 0 ? 'none' : num) + '**.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
