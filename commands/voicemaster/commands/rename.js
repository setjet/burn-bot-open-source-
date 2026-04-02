const { EmbedBuilder } = require('discord.js');
const { RENAME_COOLDOWN_MS } = require('../utils');

// cooldown exists because someone renamed 40 times in a minute 😭

module.exports = {
  name: 'rename',
  async execute(message, args, { prefix, guild, voiceChannel, channelData, db }) {
    const name = args.slice(1).join(' ').trim();
    if (!name) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}voicemaster rename <name>\`\`\``,
          '-# <:arrows:1457808531678957784> Renames your voice channel.'
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const lastRename = db.getVoiceMasterRenameCooldown(guild.id, message.author.id);
    if (lastRename && Date.now() - lastRename < RENAME_COOLDOWN_MS) {
      const sec = Math.ceil((RENAME_COOLDOWN_MS - (Date.now() - lastRename)) / 1000);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Rate limited. Try again in **' + sec + '** seconds.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (name.length > 100) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Name must be **100 characters** or less.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    await voiceChannel.setName(name).catch(() => {});
    db.setVoiceMasterRenameCooldown(guild.id, message.author.id);
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Channel renamed to **' + name + '**.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
