const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'unhide',
  aliases: [],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Unhide the current channel for @everyone.',
  async execute(message, args) {

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** permission to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Channels** permission to unhide the channel.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const channel = message.channel;
    const currentPermissions = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);

   
    if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.ViewChannel)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This channel is already **visible** to @everyone');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        ViewChannel: true
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:unhidden:1457808587253616692> <:arrows:1457808531678957784> **Successfully unhid** <#${channel.id}>`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('Error unhiding channel:', err);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to **unhide** the channel.');
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};
