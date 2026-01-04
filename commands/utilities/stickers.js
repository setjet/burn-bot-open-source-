const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

module.exports = {
  name: 'sticker',
  category: 'utilities', 
  description: '<:arrows:1363099226375979058> Add & remove stickers from the server.',
  async execute(message, args, { client, prefix }) {
    const commandName = message.content.split(' ')[0].slice(1).toLowerCase();
    const subCommand = args[0]?.toLowerCase();

    // Permissions check
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const embedNoPermissions = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Emojis and Stickers** permissions to use this command.');
      return message.reply({ embeds: [embedNoPermissions] });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const embedBotNoPerms = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Manage Emojis and Stickers** permissions to manage stickers.');
      return message.reply({ embeds: [embedBotNoPerms] });
    }

    // Show help if no subcommand is provided
    if (!subCommand && commandName === 'sticker') {
      const embedHelp = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1362876382375317565> **Usage:**',
          `\`\`\`${prefix}sticker (subcommand) (args)\`\`\``,
         '-# <:arrows:1363099226375979058> Use `add` to add a sticker, or `delete` to remove a sticker.',
          '', 
          '**Aliases:** `N/A`'
        ].join('\n'));
      return message.reply({ embeds: [embedHelp] });
    }

    // ========== ADD STICKER ==========
    const isAdd = subCommand === 'add';
    if (isAdd) {
      // Remove 'add' if using sticker command
      if (subCommand === 'add') args.shift();

      if (args.length < 1 && !message.reference?.messageId) {
        const embedUsage = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}sticker add <image-url or reply to a sticker>\`\`\``,
            '-# <:arrows:1363099226375979058> Adds a sticker to the server.',
            '',
            `**Examples:** \`${prefix}sticker add <image url>\``,
            '\n**Aliases:** `N/A`'        
          ].join('\n'));
        return message.reply({ embeds: [embedUsage] });
      }

      const validateAndProcessImage = async (url, isAnimatedSticker = false) => {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);
        let buffer = Buffer.from(response.data);

        const metadata = await sharp(buffer, { animated: true }).metadata();
        if (!metadata.format) throw new Error('Invalid image format');

        const MAX_STICKER_SIZE = 524288; // 512KB in bytes

        // Detect if it's a GIF by checking:
        // 1. Explicit flag (from sticker reply)
        // 2. File format from metadata
        // 3. Multiple pages (animated)
        // 4. URL extension
        // 5. Content-Type header
        const urlLower = url.toLowerCase();
        const isGifUrl = urlLower.includes('.gif');
        const isGifContentType = response.headers['content-type']?.toLowerCase().includes('gif');
        const isGifFormat = metadata.format === 'gif';
        const isAnimated = metadata.pages > 1;
        
        // Force GIF processing if any indicator suggests it's a GIF
        const shouldProcessAsGif = isAnimatedSticker || isGifFormat || isAnimated || isGifUrl || isGifContentType;
        
        if (shouldProcessAsGif) {
          let gifBuffer = await sharp(buffer, { animated: true })
            .resize(320, 320, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toFormat('gif')
            .toBuffer();

          // Reduce GIF size if it exceeds 512KB
          if (gifBuffer.length > MAX_STICKER_SIZE) {
            // Reduce frame count or quality to fit within size limit
            gifBuffer = await sharp(buffer, { animated: true })
              .resize(320, 320, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .gif({ colours: 128, dither: 0.5 }) // Reduce color palette and dithering
              .toBuffer();
          }

          // If still too large, throw an error
          if (gifBuffer.length > MAX_STICKER_SIZE) {
            throw new Error('GIF size exceeds 512KB even after compression');
          }

          return gifBuffer;
        } else if (metadata.format === 'gif') {
          let gifBuffer = await sharp(buffer, { animated: true })
            .resize(320, 320, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toFormat('gif')
            .toBuffer();

          // Reduce GIF size if it exceeds 512KB
          if (gifBuffer.length > MAX_STICKER_SIZE) {
            // Reduce frame count or quality to fit within size limit
            gifBuffer = await sharp(buffer, { animated: true })
              .resize(320, 320, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .gif({ colours: 128, dither: 0.5 }) // Reduce color palette and dithering
              .toBuffer();
          }

          // If still too large, throw an error
          if (gifBuffer.length > MAX_STICKER_SIZE) {
            throw new Error('GIF size exceeds 512KB even after compression');
          }

          return gifBuffer;
        } else {
          if (metadata.format !== 'png') {
            buffer = await sharp(buffer).toFormat('png').toBuffer();
          }

          let imageBuffer = await sharp(buffer)
            .resize(320, 320, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toFormat('png')
            .toBuffer();

          // Reduce PNG size if it exceeds 512KB
          if (imageBuffer.length > MAX_STICKER_SIZE) {
            let quality = 80; // Start with high quality
            do {
              imageBuffer = await sharp(buffer)
                .resize(320, 320, {
                  fit: 'inside',
                  withoutEnlargement: true
                })
                .png({ quality: quality })
                .toBuffer();
              quality -= 10; // Decrease quality incrementally
            } while (imageBuffer.length > MAX_STICKER_SIZE && quality > 10);

            // If still too large, throw an error
            if (imageBuffer.length > MAX_STICKER_SIZE) {
              throw new Error('Image size exceeds 512KB even after compression');
            }
          }

          return imageBuffer;
        }
      };

      try {
        let imageUrl, stickerName, description;

        if (args[0]?.startsWith('http://') || args[0]?.startsWith('https://')) {
          imageUrl = args[0];
          stickerName = args.slice(1).join('_') || `sticker_${Date.now()}`;
          description = 'Added via image link';
          
          // Check if URL is a GIF to preserve animation
          const urlLower = imageUrl.toLowerCase();
          const isGifUrl = urlLower.includes('.gif');
          
          // Get response to check Content-Type (use GET to get full headers)
          let isGifContentType = false;
          try {
            const checkResponse = await axios.get(imageUrl, { 
              responseType: 'arraybuffer',
              maxRedirects: 5,
              validateStatus: () => true // Don't throw on any status
            });
            const contentType = checkResponse.headers['content-type'] || '';
            isGifContentType = contentType.toLowerCase().includes('gif');
          } catch (e) {
            // If check fails, rely on URL extension
          }
          
          // Detect if it's a GIF from URL or content type
          const isGif = isGifUrl || isGifContentType;
          
          const buffer = await validateAndProcessImage(imageUrl, isGif);
          
          // Pass buffer directly - Discord.js will detect format from buffer content
          const newSticker = await message.guild.stickers.create({
            file: buffer,
            name: stickerName,
            description,
            tags: stickerName
          });

          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Added sticker** \`${newSticker.name}\` **to the server.**`)]
          });
        } else if (message.reference?.messageId) {
          const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
          if (!repliedMsg.stickers?.size) {
            return message.reply({
              embeds: [new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> The **replied message** does not contain any **sticker**.')]
            });
          }

          const sticker = repliedMsg.stickers.first();
          const isAnimatedSticker = sticker.format === 'GIF' || sticker.format === 'APNG'; // Check if sticker is animated
          // Force the URL to use .gif extension if the sticker is animated
          imageUrl = isAnimatedSticker 
            ? `https://media.discordapp.net/stickers/${sticker.id}.gif?passthrough=true`
            : `https://media.discordapp.net/stickers/${sticker.id}.png?passthrough=true`;
          stickerName = args.length > 0 ? args.join('_') : sticker.name || `sticker_${Date.now()}`;
          description = sticker.description || 'Added via command';
          const buffer = await validateAndProcessImage(imageUrl, isAnimatedSticker);
          
          // Pass buffer directly - Discord.js will detect format from buffer content
          const newSticker = await message.guild.stickers.create({
            file: buffer,
            name: stickerName,
            description,
            tags: stickerName
          });

          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Added sticker** \`${newSticker.name}\` **to the server.**`)]
          });
        }
      } catch (error) {
        console.error('Add Sticker Error:', error);
        let msg = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to add sticker.';
        if (error.message.includes('Invalid image format') || error.code === 50046) {
          msg = '<:excl:1362858572677120252> <:arrows:1363099226375979058> The file is not valid or not a processable image.';
        } else if (error.message.includes('Maximum number of stickers')) {
          msg = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Server sticker limit reached.';
        } else if (error.message.includes('size exceeds 512KB')) {
          msg = '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Image** or **GIF** is too large **(exceeds 512KB)** even after compression.';
        }
        return message.reply({ embeds: [new EmbedBuilder().setColor('#838996').setDescription(msg)] });
      }
    }

    // ========== DELETE STICKER ==========
    const isDelete = subCommand === 'delete';
    if (isDelete) {
      // Remove 'delete' if using sticker command
      if (subCommand === 'delete') args.shift();

      if (args.length < 1) {
        const embedUsage = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}sticker delete <stickername>\`\`\``,
            '-# <:arrows:1363099226375979058> Deletes a sticker from the server.',
            '',
            `**Examples:** \`${prefix}sticker delete waving\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'));
        return message.reply({ embeds: [embedUsage] });
      }

      const stickerName = args.join(' ').toLowerCase();
      try {
        const stickers = await message.guild.stickers.fetch();
        const sticker = stickers.find(s => s.name.toLowerCase().includes(stickerName));

        if (!sticker) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> No sticker found with the name including \`${stickerName}\`.`)]
          });
        }

        await message.guild.stickers.delete(sticker.id, 'Deleted via command');
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:deleted:1363170791457427546> <:arrows:1363099226375979058> **Deleted sticker** \`${sticker.name}\` **from the server.**`)]
        });

      } catch (err) {
        console.error('Delete Sticker Error:', err);
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while deleting the sticker.')]
        });
      }
    }
  }
};