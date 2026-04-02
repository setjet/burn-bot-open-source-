const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// join-to-create + role pairing sounded elegant; discord had notes 😭

module.exports = {
  name: 'joinrole',
  async execute(message, args, { prefix, guild, db, config }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const roleInput = args.slice(2).join(' ').trim();
    if (!roleInput) {
      const current = config.joinRoleId ? `<@&${config.joinRoleId}>` : 'None';
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}voicemaster join role <role>\`\`\``,
          '-# <:arrows:1457808531678957784> Members get this role when joining a temp voice channel.',
          '',
          '**Current join role:** ' + current
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const roleId = roleInput.replace(/<@&(\d+)>/, '$1');
    const role = guild.roles.cache.get(roleId) || guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
    if (!role) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Role not found.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    db.setVoiceMasterConfig(guild.id, { ...config, joinRoleId: role.id });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Join role set to ' + role + '. Members will receive this role when joining a temp voice channel and lose it when they leave.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
