const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// default vc name template — the feature i almost shipped before boredom won 😭

module.exports = {
  name: 'default',
  async execute(message, args, { prefix, guild, db, config }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const defSub = args[1]?.toLowerCase();
    if (defSub === 'name') {
      const name = args.slice(2).join(' ').trim();
      if (!name) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}voicemaster default name <template>\`\`\``,
            '-# <:arrows:1457808531678957784> Variables: `{user}`, `{user.name}`, `{user.display_name}`'
          ].join('\n'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      db.setVoiceMasterConfig(guild.id, { ...config, defaultName: name });
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Default name set to `' + name + '`.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (defSub === 'bitrate') {
      const num = parseInt(args[2], 10);
      if (isNaN(num) || num < 8 || num > 384) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Bitrate must be between **8** and **384** (kbps).');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const bitrateBps = num * 1000;
      db.setVoiceMasterConfig(guild.id, { ...config, defaultBitrate: bitrateBps });
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Default bitrate set to **' + num + '** kbps.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (defSub === 'region') {
      const region = args.slice(2).join(' ').trim() || null;
      db.setVoiceMasterConfig(guild.id, { ...config, defaultRegion: region || null });
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> ' + (region ? 'Default region set to **' + region + '**.' : 'Default region cleared (auto).'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        '<:settings:1457808572720087266> **Usage:**',
        `\`\`\`${prefix}voicemaster default name <template>\`\`\``,
        `\`\`\`${prefix}voicemaster default bitrate <8-384>\`\`\``,
        `\`\`\`${prefix}voicemaster default region <region>\`\`\``,
        '-# <:arrows:1457808531678957784> Configure default settings for new temp channels.'
      ].join('\n'));
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
