const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// overwrite math: overwrites math 😭

module.exports = {
  name: 'hide',
  aliases: [],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Hide the current channel from @everyone.',
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
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Channels** permission to hide the channel.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const channel = message.channel;
    const currentPermissions = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);

   
    if (currentPermissions?.deny.has(PermissionFlagsBits.ViewChannel)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This channel is already **hidden** from @everyone');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        ViewChannel: false
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:hidden:1457808583323422936> <:arrows:1457808531678957784> **Successfully hid** <#${channel.id}>`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('Error hiding channel:', err);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to **hide** the channel.');
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};