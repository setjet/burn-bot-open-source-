module.exports = {
    name: 'enlarge',
    aliases: ['e'],
    category: ['miscellaneous'],
    description: ['<:arrows:1363099226375979058> Enlarges a selected emoji.'],
    async execute(message, args, { client, prefix }) {

      if (args.length < 1) {
        return message.reply(`Add an emoji to enlarge, **Example:** \`${prefix}enlarge :cat:\``);
      }
  
      const emojiInput = args[0];
  
      try {

        const customEmojiMatch = emojiInput.match(/^<a?:(\w+):(\d+)>$/);
        let emojiUrl, isAnimated;
  
        if (customEmojiMatch) {
         
          const emojiId = customEmojiMatch[2];
          isAnimated = emojiInput.startsWith('<a:');
          emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?v=1`;
  
          
          await message.reply(emojiUrl);
        } else {
       
          const unicodeEmoji = emojiInput.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
          if (!unicodeEmoji) {
            return message.reply('❌ Invalid emoji. Provide a valid emoji.');
          }
  
   
          await message.reply(emojiInput);
        }
      } catch (error) {
        console.error('Error in enlarge command:', error);
        await message.reply('❌ An error occurred while enlarging the emoji.');
      }
    }
  };