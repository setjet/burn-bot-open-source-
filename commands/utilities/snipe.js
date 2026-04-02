const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'snipe',
  aliases: ['s'], category: ['miscellaneous'],
  description: ['<:arrows:1457808531678957784> Snipe the last deleted message.'],
  async execute(message, args, context) {
    const snipedMessages = context.client.deletedMessages.get(message.channel.id);

    if (!snipedMessages || snipedMessages.length === 0) {
      // nothing deleted recently — either a quiet channel or someone cleared snipes 😭
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> There is nothing to **snipe**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    
    const index = Math.max(0, Math.min((parseInt(args[0]) || 1) - 1, snipedMessages.length - 1));
    // clamp so `snipe 999` doesn't invent a parallel timeline 😭

    const sniped = snipedMessages[index];

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
      .setAuthor({ name: sniped.author, iconURL: sniped.avatar })
      .setDescription(sniped.content || '*[no text]*');

    if (sniped.attachment) {
      embed.setImage(sniped.attachment);
    }
    // image snipes: where moderation and chaos share a thumbnail 😭

    embed.setFooter({ text: `Deleted ${timeAgo(sniped.timestamp)} • Message ${index + 1} of ${snipedMessages.length}` });

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};