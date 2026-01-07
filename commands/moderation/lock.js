const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'lock',
  aliases: ['lockdown'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Lock a channel',
  async execute(message) {
    try {

      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        try {
          await message.react('❌');
        } catch {} 
        return;
      }


      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        try {
          await message.react('❌');
        } catch {}
        return;
      }


      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });


      try {
        await message.react('🔒');
      } catch {} 

    } catch (error) {
      console.error('Lock command error:', error);
      try {
        await message.react('❌');
      } catch {} 
    }
  }
};