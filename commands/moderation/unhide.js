const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'unhide',
  aliases: [],
  category: 'moderation',
  description: '<:arrows:1363099226375979058> Unhide the current channel for @everyone.',
  async execute(message, args) {

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Channels** permission to use this command.');
      return message.reply({ embeds: [embed] });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Manage Channels** permission to unhide the channel.');
      return message.reply({ embeds: [embed] });
    }

    const channel = message.channel;
    const currentPermissions = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);

   
    if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.ViewChannel)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> This channel is already **visible** to @everyone');
      return message.reply({ embeds: [embed] });
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        ViewChannel: true
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:unhidden:1363803882337341583> <:arrows:1363099226375979058> **Successfully unhid** <#${channel.id}>`);

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error unhiding channel:', err);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1363099226375979058> Failed to **unhide** the channel.');
      await message.reply({ embeds: [embed] });
    }
  }
};
