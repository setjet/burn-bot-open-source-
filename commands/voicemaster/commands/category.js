const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

// category id validation — wrong paste = silent suffering 😭

module.exports = {
  name: 'category',
  async execute(message, args, { prefix, guild, db, config }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const categoryInput = args.slice(1).join(' ').trim();
    if (!categoryInput) {
      const current = config.categoryId ? `<#${config.categoryId}>` : 'Same as VoiceMaster category';
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}voicemaster category <category>\`\`\``,
          '-# <:arrows:1457808531678957784> Sets where new temp voice channels are created.',
          '',
          '**Current category:** ' + current
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const categoryId = categoryInput.replace(/<#(\d+)>/, '$1').replace(/\D/g, '') || categoryInput;
    const category = guild.channels.cache.get(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid or missing **category**. Use a category ID or mention.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    db.setVoiceMasterConfig(guild.id, { ...config, categoryId: category.id });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> New temp channels will be created in category **' + category.name + '**.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
