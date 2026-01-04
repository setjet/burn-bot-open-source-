const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'botclear',
  aliases: ['bc'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Clear messages from bots.',
  async execute(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return;
    }

    try {
      const messages = await message.channel.messages.fetch({ limit: 99 });

      const filtered = messages.filter(msg =>
        msg.author.bot || msg.content.startsWith(';')
      );

      await message.channel.bulkDelete(filtered, true);
    } catch (err) {
      console.error('Failed to clear bot messages:', err);
    }
  }
};
