const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'unlock',
  aliases: ['ul'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Unlock a locked channel.',
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
        SendMessages: null 
      });

    
      try {
        await message.react('🔓');
      } catch {} 

    } catch (error) {
      console.error('Unlock command error:', error);
      try {
        await message.react('❌');
      } catch {} 
    }
  }
};