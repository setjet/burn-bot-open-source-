const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'editsnipe',
  aliases: ['es'],
  description: '<:arrows:1457808531678957784> Snipe the last edited message',
  category: 'utilities',

  async execute(message, args, context) {
    const editedMessages = context.client.editedMessages.get(message.channel.id);

    if (!editedMessages || editedMessages.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> There is nothing to **edit snipe**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    
    const index = Math.max(0, Math.min((parseInt(args[0]) || 1) - 1, editedMessages.length - 1));
    
    const edited = editedMessages[index];

    function timeAgo(timestamp) {
      const now = Date.now();
      const diffInSeconds = Math.floor((now - timestamp) / 1000);

      const seconds = diffInSeconds;
      const minutes = Math.floor(diffInSeconds / 60);
      const hours = Math.floor(diffInSeconds / 3600);
      const days = Math.floor(diffInSeconds / 86400);
      const months = Math.floor(diffInSeconds / 2592000);
      const years = Math.floor(diffInSeconds / 31536000);

      if (seconds < 60) {
        return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
      } else if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      } else if (hours < 24) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else if (days < 30) {
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      } else if (months < 12) {
        return `${months} month${months !== 1 ? 's' : ''} ago`;
      } else {
        return `${years} year${years !== 1 ? 's' : ''} ago`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: edited.author, iconURL: edited.avatar })
      .addFields(
        { name: 'Original Message', value: edited.originalContent || '*[no text]*' },
        { name: 'Edited Message', value: edited.editedContent || '*[no text]*' }
      )
      .setFooter({ text: `Edited ${timeAgo(edited.timestamp)} • Message ${index + 1} of ${editedMessages.length}` });

    if (edited.attachment) {
      embed.setImage(edited.attachment);
    }

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};