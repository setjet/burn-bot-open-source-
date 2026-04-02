const { EmbedBuilder } = require('discord.js');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// sharp + temp files + discord attachment limits = spa day 😭

module.exports = {
  name: 'togif',
  aliases: ['gif'],
  category: ['utilities'],
  description: '<:arrows:1457808531678957784> Convert an image to GIF format.',
  async execute(message) {
    
    if (!message.reference?.messageId) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Reply to an **image message** to convert it to **GIF**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    try {

      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      
      
      const imageUrl = repliedMessage.attachments.first()?.url || 
                      repliedMessage.embeds[0]?.image?.url || 
                      repliedMessage.embeds[0]?.thumbnail?.url;

      if (!imageUrl) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The **replied message** doesn\'t contain an **image**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }


      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');


      if (imageUrl.toLowerCase().endsWith('.gif') || 
          response.headers['content-type']?.includes('gif')) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This image is already a **GIF**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

    
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      
      const tempOutput = path.join(tempDir, `output_${Date.now()}.gif`);

      await sharp(buffer)
        .toFormat('gif')
        .toFile(tempOutput);

   
      await message.reply({
        
        files: [{
          attachment: tempOutput,
          name: 'burntogif.gif'
        }],
        allowedMentions: { repliedUser: false }
      });

 
      fs.unlinkSync(tempOutput);
    } catch (error) {
      console.error('Error converting to GIF:', error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to convert **image** to **GIF**. Make sure you\'re replying to a **valid image**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};