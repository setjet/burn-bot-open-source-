const { EmbedBuilder } = require('discord.js');

// permit user — overwrite soup, my favorite cuisine 😭

module.exports = {
  name: 'permit',
  async execute(message, args, { prefix, guild, voiceChannel, channelData, getUser, db }) {
    const target = args[1];
    if (!target) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}voicemaster permit <user or role>\`\`\``,
          '-# <:arrows:1457808531678957784> Allows them to join when the channel is locked.'
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const user = await getUser(message, target);
    const roleId = target.replace(/<@&(\d+)>/, '$1');
    const role = guild.roles.cache.get(roleId);
    const permitted = channelData.permittedIds || [];
    const idToAdd = user ? user.id : (role ? role.id : null);
    if (!idToAdd) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User or role not found.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const permType = user ? 1 : 0;
    if (permitted.includes(idToAdd)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> That user or role is already permitted.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    permitted.push(idToAdd);
    await voiceChannel.permissionOverwrites.edit(idToAdd, { ViewChannel: true, Connect: true, type: permType }).catch(() => {});
    db.setVoiceMasterChannel(voiceChannel.id, { ...channelData, permittedIds: permitted });
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> ' + (user ? 'User' : 'Role') + ' can now join when locked.');
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
