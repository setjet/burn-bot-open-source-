const { EmbedBuilder } = require('discord.js');

// nukes the snipe map; mods love it, my past self forgot it existed 😭

module.exports = {
  name: 'clearsnipe',
  aliases: ['cs'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Clear sniped messages.',
  async execute(message) {

    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need the **Manage Messages** permission to use this command.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (!message.client.deletedMessages.has(message.channel.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('>>> No deleted messages found.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }


    const sniped = message.client.deletedMessages.get(message.channel.id);


    message.client.deletedMessages.delete(message.channel.id);

    if (sniped) {
      try {

        await message.react('<:tup:1457809442455294104>'); 
      } catch (error) {
        console.error('Error reacting to command message:', error);
      }
    }
  }
};
