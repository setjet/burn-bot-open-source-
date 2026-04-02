const { PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

// lottie vs png stickers wanted different pipelines; i aged 😭

module.exports = {
  name: 'sticker',
  category: 'utilities', 
  description: '<:arrows:1457808531678957784> Add & remove stickers from the server.',
  async execute(message, args, { client, prefix }) {
    const commandName = message.content.split(' ')[0].slice(1).toLowerCase();
    const subCommand = args[0]?.toLowerCase();

    // Permissions check
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const embedNoPermissions = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Emojis and Stickers** permissions to use this command.');
      return message.reply({ embeds: [embedNoPermissions], allowedMentions: { repliedUser: false } });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const embedBotNoPerms = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Emojis and Stickers** permissions to manage stickers.');
      return message.reply({ embeds: [embedBotNoPerms], allowedMentions: { repliedUser: false } });
    }

    // Show help if no subcommand is provided
    if (!subCommand && commandName === 'sticker') {
      const embedHelp = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        '<:settings:1457808572720087266> **Usage:**',
        `\`\`\`${prefix}sticker (subcommand)\`\`\``,
        '-# <:arrows:1457808531678957784> **__Subcommands__**\n <:leese:1457834970486800567> `add` to add a sticker.\n <:tree:1457808523986731008>  `delete` to remove a sticker.',
        '',
        '**Aliases:** `N/A`'
      ].join('\n'));
      return message.reply({ embeds: [embedHelp], allowedMentions: { repliedUser: false } });
    }

    // ========== ADD STICKER ==========
    const isAdd = subCommand === 'add';
    if (isAdd) {
      // Remove 'add' if using sticker command
      if (subCommand === 'add') args.shift();

      if (!message.reference?.messageId) {
        const embedUsage = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}sticker add (reply to a sticker)\`\`\``,
            '-# <:arrows:1457808531678957784> Reply to a sticker message to add it to the server.',
            '',
            `**Example:** Reply to a sticker and use \`${prefix}sticker add\``,
            '\n**Aliases:** `N/A`'        
          ].join('\n'));
        return message.reply({ embeds: [embedUsage], allowedMentions: { repliedUser: false } });
      }

      const validateAndProcessImage = async (url, isAnimatedSticker = false) => {
        const response = await axios.get(url, { 
          responseType: 'arraybuffer',
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 300
        });
        if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);
        let buffer = Buffer.from(response.data);
        
        // Validate buffer is not empty
        if (!buffer || buffer.length === 0) {
          throw new Error('Empty or invalid file received');
        }
        
        // Check content-type header to see what we actually received
        const contentType = response.headers['content-type'] || '';
        console.log(`Fetched from ${url}: Content-Type: ${contentType}, Size: ${buffer.length} bytes`);
        
        // Check if response is actually an image (not HTML/JSON error page)
        if (contentType && !contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
          // Check if it's HTML or JSON (error page)
          const bufferStart = buffer.slice(0, 100).toString();
          if (bufferStart.trim().startsWith('<') || bufferStart.trim().startsWith('{')) {
            throw new Error(`Received non-image response (${contentType}). URL may be invalid or require authentication.`);
          }
        }

        // Detect format from buffer header and content-type (more reliable than Sharp)
        const isGifByHeader = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // "GIF" magic bytes
        const isPngByHeader = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47; // PNG magic bytes
        const isJpegByHeader = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF; // JPEG magic bytes (FF D8 FF)
        
        // Try to get metadata with Sharp (but don't fail if it doesn't work)
        let metadata = null;
        try {
          // Try simple Sharp call without any options first
          metadata = await sharp(buffer).metadata();
        } catch (error) {
          console.log('Sharp metadata failed, using header detection:', error.message);
          // Use header detection as fallback
          if (isGifByHeader) {
            metadata = { format: 'gif', pages: 1, width: 320, height: 320 };
          } else if (isPngByHeader) {
            metadata = { format: 'png', width: 320, height: 320 };
          } else if (isJpegByHeader || contentType.includes('jpeg') || contentType.includes('jpg')) {
            metadata = { format: 'jpeg', width: 320, height: 320 }; // Will be converted to PNG
          } else if (contentType.includes('gif')) {
            metadata = { format: 'gif', pages: 1, width: 320, height: 320 };
          } else if (contentType.includes('png')) {
            metadata = { format: 'png', width: 320, height: 320 };
          } else if (contentType.includes('image/')) {
            // Generic image - try to detect from content-type
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
              metadata = { format: 'jpeg', width: 320, height: 320 };
            } else {
              throw new Error(`Unable to determine image format. Content-Type: ${contentType}`);
            }
          } else {
            throw new Error(`Unable to determine image format. Content-Type: ${contentType}`);
          }
        }
        
        // If metadata is still null, use header detection
        if (!metadata || !metadata.format) {
          if (isGifByHeader || isAnimatedSticker || contentType.includes('gif')) {
            metadata = { format: 'gif', pages: 1, width: 320, height: 320 };
          } else if (isPngByHeader || contentType.includes('png')) {
            metadata = { format: 'png', width: 320, height: 320 };
          } else if (isJpegByHeader || contentType.includes('jpeg') || contentType.includes('jpg')) {
            metadata = { format: 'jpeg', width: 320, height: 320 };
          } else {
            throw new Error('Unable to determine image format');
          }
        }
        
        console.log(`Detected format: ${metadata.format}, Size: ${buffer.length} bytes`);

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
          let gifBuffer;
          
          // Check if buffer is already small enough and valid - if so, use it directly
          if (buffer.length <= MAX_STICKER_SIZE && isGifByHeader) {
            console.log('GIF is already valid size, using buffer directly');
            return { buffer: buffer, isGif: true };
          }
          
          // Try to process with Sharp (simple call, no animated option)
          try {
            gifBuffer = await sharp(buffer)
              .resize(320, 320, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .toFormat('gif')
              .toBuffer();
          } catch (gifError) {
            console.error('Sharp GIF processing failed:', gifError.message);
            // If Sharp fails but it's a valid GIF and under size limit, use original buffer
            if (isGifByHeader && buffer.length <= MAX_STICKER_SIZE) {
              console.log('Using original GIF buffer as Sharp failed');
              return { buffer: buffer, isGif: true };
            }
            throw new Error(`Failed to process GIF: ${gifError.message}`);
          }

          // Reduce GIF size if it exceeds 512KB
          if (gifBuffer.length > MAX_STICKER_SIZE) {
            // Reduce frame count or quality to fit within size limit
            try {
              gifBuffer = await sharp(buffer)
                .resize(320, 320, {
                  fit: 'inside',
                  withoutEnlargement: true
                })
                .gif({ colours: 128, dither: 0.5 }) // Reduce color palette and dithering
                .toBuffer();
            } catch (compressError) {
              console.error('GIF compression failed:', compressError.message);
              throw new Error('GIF is too large and cannot be compressed further');
            }
          }

          // If still too large, throw an error
          if (gifBuffer.length > MAX_STICKER_SIZE) {
            throw new Error('GIF size exceeds 512KB even after compression');
          }

          return { buffer: gifBuffer, isGif: true };
        } else {
          // Check if PNG is already valid size - if so, use it directly (only for PNG, not JPEG)
          if (isPngByHeader && buffer.length <= MAX_STICKER_SIZE && metadata.format === 'png') {
            console.log('PNG is already valid size, using buffer directly');
            return { buffer: buffer, isGif: false };
          }
          
          // Convert to PNG if needed (JPEG, WebP, etc. need conversion), then resize
          let processedBuffer = buffer;
          try {
            if (metadata.format !== 'png') {
              // Convert JPEG/WebP/etc. to PNG
              console.log(`Converting ${metadata.format} to PNG`);
              try {
                // Use the same approach as togif.js - simple Sharp call
                const sharpInstance = sharp(buffer);
                processedBuffer = await sharpInstance.toFormat('png').toBuffer();
              } catch (convertError) {
                console.error('Sharp conversion failed:', convertError.message);
                console.error('Error stack:', convertError.stack);
                // If it's a JPEG and Sharp fails, we can't proceed - Discord requires PNG/GIF
                if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
                  throw new Error('Unable to convert JPEG to PNG. Sharp processing failed. Please try using a PNG or GIF image instead, or reinstall Sharp: npm rebuild sharp');
                }
                throw convertError;
              }
            }

            let imageBuffer;
            try {
              // Use the same approach as togif.js - simple Sharp call
              const sharpInstance = sharp(processedBuffer);
              imageBuffer = await sharpInstance
                .resize(320, 320, {
                  fit: 'inside',
                  withoutEnlargement: true
                })
                .toFormat('png')
                .toBuffer();
            } catch (resizeError) {
              console.error('Sharp resize failed:', resizeError.message);
              console.error('Error stack:', resizeError.stack);
              // If resize fails but we have a valid PNG that's small enough, use it
              if (processedBuffer.length <= MAX_STICKER_SIZE && (isPngByHeader || metadata.format === 'png')) {
                console.log('Using converted buffer as resize failed');
                return { buffer: processedBuffer, isGif: false };
              }
              throw resizeError;
            }

            // Reduce PNG size if it exceeds 512KB
            if (imageBuffer.length > MAX_STICKER_SIZE) {
              let quality = 80; // Start with high quality
              do {
                try {
                  imageBuffer = await sharp(processedBuffer)
                    .resize(320, 320, {
                      fit: 'inside',
                      withoutEnlargement: true
                    })
                    .png({ quality: quality })
                    .toBuffer();
                } catch (compressError) {
                  console.error('Compression attempt failed:', compressError.message);
                  break; // Stop trying to compress
                }
                quality -= 10; // Decrease quality incrementally
              } while (imageBuffer.length > MAX_STICKER_SIZE && quality > 10);

              // If still too large, throw an error
              if (imageBuffer.length > MAX_STICKER_SIZE) {
                throw new Error('Image size exceeds 512KB even after compression');
              }
            }

            return { buffer: imageBuffer, isGif: false };
          } catch (pngError) {
            console.error('Sharp PNG processing failed:', pngError.message);
            // If Sharp fails but it's a valid PNG and under size limit, use original buffer
            if (isPngByHeader && buffer.length <= MAX_STICKER_SIZE) {
              console.log('Using original PNG buffer as Sharp failed');
              return { buffer: buffer, isGif: false };
            }
            // For JPEG, if Sharp fails completely, we can't proceed
            if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
              throw new Error('Unable to process JPEG image. Please try converting it to PNG or GIF first, or use a different image.');
            }
            throw new Error(`Failed to process image: ${pngError.message}`);
          }
        }
      };

      try {
        // Only handle reply to sticker
        if (message.reference?.messageId) {
          const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
          if (!repliedMsg.stickers?.size) {
            return message.reply({
              embeds: [new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The **replied message** does not contain any **sticker**.')],
              allowedMentions: { repliedUser: false }
            });
          }

          const sticker = repliedMsg.stickers.first();
          // Note: LOTTIE stickers cannot be processed by Sharp - they need special handling
          // For now, we'll skip LOTTIE stickers and show an error
          if (sticker.format === 'LOTTIE') {
            return message.reply({
              embeds: [new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **LOTTIE stickers** cannot be copied. Please use **GIF** or **PNG** stickers instead.')],
              allowedMentions: { repliedUser: false }
            });
          }
          
          const isAnimatedSticker = sticker.format === 'GIF' || sticker.format === 'APNG'; // Check if sticker is animated
          
          stickerName = args.length > 0 ? args.join('_') : sticker.name || `sticker_${Date.now()}`;
          description = sticker.description || 'Added via command';
          
          // Try multiple URL formats for Discord stickers
          // Discord.js provides .url property, but we'll also try CDN URLs as fallback
          let imageUrl;
          let buffer, isGifBuffer;
          let lastError;
          
          // List of URLs to try in order
          const urlAttempts = [];
          
          // First, try the sticker's URL property (most reliable)
          if (sticker.url) {
            urlAttempts.push(sticker.url);
          }
          
          // Then try CDN URLs based on format
          if (isAnimatedSticker) {
            urlAttempts.push(`https://cdn.discordapp.com/stickers/${sticker.id}.gif`);
            urlAttempts.push(`https://media.discordapp.net/stickers/${sticker.id}.gif`);
          } else {
            urlAttempts.push(`https://cdn.discordapp.com/stickers/${sticker.id}.png`);
            urlAttempts.push(`https://media.discordapp.net/stickers/${sticker.id}.png`);
          }
          
          // Try each URL until one works
          for (const url of urlAttempts) {
            try {
              imageUrl = url;
              console.log(`Attempting to fetch sticker from: ${url}`);
              const result = await validateAndProcessImage(url, isAnimatedSticker);
              buffer = result.buffer;
              isGifBuffer = result.isGif;
              console.log(`Successfully fetched and processed sticker from: ${url}`);
              break; // Success, exit loop
            } catch (error) {
              lastError = error;
              console.log(`Failed to fetch sticker from ${url}:`, error.message);
              // If this is the last URL and it's a format error, provide more context
              if (url === urlAttempts[urlAttempts.length - 1] && error.message.includes('Invalid image format')) {
                console.error('All URL attempts failed. Sticker info:', {
                  id: sticker.id,
                  name: sticker.name,
                  format: sticker.format,
                  url: sticker.url,
                  guildId: sticker.guildId
                });
              }
              continue; // Try next URL
            }
          }
          
          // If all URLs failed, throw the last error with more context
          if (!buffer) {
            const errorMsg = lastError 
              ? `Failed to fetch sticker: ${lastError.message}` 
              : 'Failed to fetch sticker from all attempted URLs';
            console.error('All sticker URL attempts failed. Last error:', lastError);
            throw new Error(errorMsg);
          }
          
          // Use AttachmentBuilder with proper extension so Discord knows it's a GIF
          const file = isGifBuffer 
            ? new AttachmentBuilder(buffer, { name: `${stickerName}.gif` })
            : new AttachmentBuilder(buffer, { name: `${stickerName}.png` });
          
          const newSticker = await message.guild.stickers.create({
            file: file,
            name: stickerName,
            description,
            tags: stickerName
          });

          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Added sticker** \`${newSticker.name}\` **to the server.**`)],
            allowedMentions: { repliedUser: false }
          });
        }
      } catch (error) {
        console.error('Add Sticker Error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url
        });
        let msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to add sticker.';
        if (error.message.includes('Invalid image format') || error.message.includes('Empty or invalid file') || error.code === 50046) {
          msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The file is not valid or not a processable image.';
        } else if (error.message.includes('HTTP error') || error.response?.status) {
          msg = `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to fetch the sticker image (HTTP ${error.response?.status || 'error'}).`;
        } else if (error.message.includes('Maximum number of stickers')) {
          msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Server sticker limit reached.';
        } else if (error.message.includes('size exceeds 512KB')) {
          msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Image** or **GIF** is too large **(exceeds 512KB)** even after compression.';
        }
        return message.reply({ embeds: [new EmbedBuilder().setColor('#838996').setDescription(msg)], allowedMentions: { repliedUser: false } });
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
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}sticker delete <stickername>\`\`\``,
            '-# <:arrows:1457808531678957784> Deletes a sticker from the server.',
            '',
            `**Examples:** \`${prefix}sticker delete waving\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'));
        return message.reply({ embeds: [embedUsage], allowedMentions: { repliedUser: false } });
      }

      const stickerName = args.join(' ').toLowerCase();
      try {
        const stickers = await message.guild.stickers.fetch();
        const sticker = stickers.find(s => s.name.toLowerCase().includes(stickerName));

        if (!sticker) {
          return message.reply({
            embeds: [new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No sticker found with the name including \`${stickerName}\`.`)],
            allowedMentions: { repliedUser: false }
          });
        }

        await message.guild.stickers.delete(sticker.id, 'Deleted via command');
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:deleted:1457808575316492309> <:arrows:1457808531678957784> **Deleted sticker** \`${sticker.name}\` **from the server.**`)],
          allowedMentions: { repliedUser: false }
        });

      } catch (err) {
        console.error('Delete Sticker Error:', err);
        return message.reply({
          embeds: [new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while deleting the sticker.')],
          allowedMentions: { repliedUser: false }
        });
      }
    }
  }
};