const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'clearsnipe',
  aliases: ['cs'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Clear sniped messages.',
  async execute(message) {

    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need the **Manage Messages** permission to use this command.')
        ]
      });
    }

    if (!message.client.deletedMessages.has(message.channel.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('>>> No deleted messages found.')
        ]
      });
    }


    const sniped = message.client.deletedMessages.get(message.channel.id);


    message.client.deletedMessages.delete(message.channel.id);

    if (sniped) {
      try {

        await message.react('<:tup:1363830714016989215>'); 
      } catch (error) {
        console.error('Error reacting to command message:', error);
      }
    }
  }
};
