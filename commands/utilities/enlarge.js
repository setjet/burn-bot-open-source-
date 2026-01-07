module.exports = {
    name: 'enlarge',
    aliases: ['e'],
    category: ['miscellaneous'],
    description: ['<:arrows:1457808531678957784> Enlarges a selected emoji.'],
    async execute(message, args, { client, prefix }) {

      if (args.length < 1) {
        return message.reply({ content: `Add an emoji to enlarge, **Example:** \`${prefix}enlarge :cat:\``, allowedMentions: { repliedUser: false } });
      }
  
      const emojiInput = args[0];
  
      try {

        const customEmojiMatch = emojiInput.match(/^<a?:(\w+):(\d+)>$/);
        let emojiUrl, isAnimated;
  
        if (customEmojiMatch) {
         
          const emojiId = customEmojiMatch[2];
          isAnimated = emojiInput.startsWith('<a:');
          emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?v=1`;
  
          
          await message.reply({ content: emojiUrl, allowedMentions: { repliedUser: false } });
        } else {
       
          const unicodeEmoji = emojiInput.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
          if (!unicodeEmoji) {
            return message.reply({ content: '❌ Invalid emoji. Provide a valid emoji.', allowedMentions: { repliedUser: false } });
          }

   
          await message.reply({ content: emojiInput, allowedMentions: { repliedUser: false } });
        }
      } catch (error) {
        console.error('Error in enlarge command:', error);
        await message.reply({ content: '❌ An error occurred while enlarging the emoji.', allowedMentions: { repliedUser: false } });
      }
    }
  };