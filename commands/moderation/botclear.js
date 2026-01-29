const { PermissionsBitField } = require('discord.js');

const MAX_DELETE = 5;
const FETCH_LIMIT = 20;

module.exports = {
  name: 'botclear',
  aliases: ['bc'],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Clear messages from bots.',
  async execute(message, args, { prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return;
    }

    try {
      const messages = await message.channel.messages.fetch({ limit: FETCH_LIMIT });

      const filtered = messages.filter(msg =>
        msg.id !== message.id &&
        (msg.author.bot || msg.content.startsWith(prefix))
      );
      const toDelete = Array.from(filtered.values()).slice(0, MAX_DELETE);

      if (toDelete.length === 0) {
        return;
      }

      await message.channel.bulkDelete(toDelete, true);
    } catch (err) {
      console.error('Failed to clear bot messages:', err);
      await message.react('⚠️').catch(() => {});
    }
  }
};

