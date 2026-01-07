const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'image',
    aliases: ['img'],
    description: '<:arrows:1457808531678957784> View images from the net',
    category: 'utilities',
    async execute(message, args, { prefix }) {
        if (!args.length) {
            return message.reply({ content: `Please provide a search query. Example: \`${prefix}image puppies\``, allowedMentions: { repliedUser: false } });
        }

        const query = args.join(' ');
        const sources = [
            {
                name: 'Bing',
                url: `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`,
                selector: 'img.mimg',
                getPhotographer: () => ''
            }
        ];

        try {
            let images = [];
            let currentSourceIndex = 0;

            while (images.length === 0 && currentSourceIndex < sources.length) {
                const source = sources[currentSourceIndex];
                try {
                    await delay(2000); 
                    
                    const response = await axios.get(source.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept-Language': 'en-US,en;q=0.9'
                        },
                        timeout: 10000
                    });

                    const $ = cheerio.load(response.data);
                    $(source.selector).each((i, el) => {
                        const src = $(el).attr('src') || $(el).attr('data-src');
                        if (src && src.startsWith('http')) {
                            images.push({
                                url: src.split('?')[0],
                                sourceUrl: source.url
                            });
                            if (images.length >= 30) return false;
                        }
                    });

                    currentSourceIndex++;
                } catch (error) {
                    console.error(`Error with ${source.name}:`, error.message);
                    currentSourceIndex++;
                    continue;
                }
            }

            if (images.length === 0) {
                return message.reply({ content: `No images found for "${query}". Try a different search term.`, allowedMentions: { repliedUser: false } });
            }

            let currentIndex = 0;

            const createEmbed = () => new EmbedBuilder()
                .setColor('#838996')
                .setTitle(query)
                .setURL(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`)
                .setImage(images[currentIndex].url)
                .setFooter({ text: `Image ${currentIndex + 1} of ${images.length} (safe search)`  });

            const createButtons = () => new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_img')
                        .setEmoji('1363819173792321576')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('next_img')
                        .setEmoji('1363819150169866250')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentIndex === images.length - 1),
                    new ButtonBuilder()
                        .setCustomId('delete_embed')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                );

            const sentMessage = await message.reply({
                embeds: [createEmbed()],
                components: [createButtons()],
                allowedMentions: { repliedUser: false }
            });

            const collector = sentMessage.createMessageComponentCollector({
                time: 300000
            });

            collector.on('collect', async i => {
                // Author check
                if (i.user.id !== message.author.id) {
                    await i.reply({
                        ephemeral: true,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#838996')
                                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You **cannot interact** with this embed.')
                        ]
                    });
                    return;
                }

                // Handle buttons
                if (i.customId === 'prev_img') {
                    currentIndex--;
                    await i.update({
                        embeds: [createEmbed()],
                        components: [createButtons()]
                    });
                } else if (i.customId === 'next_img') {
                    currentIndex++;
                    await i.update({
                        embeds: [createEmbed()],
                        components: [createButtons()]
                    });
                } else if (i.customId === 'delete_embed') {
                    await i.message.delete().catch(console.error);
                    collector.stop(); // Stops interaction after deletion
                }
            });

            collector.on('end', () => {
                sentMessage.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Image search error:', error);
            message.reply({
                content: 'Failed to fetch images',
                ephemeral: true,
                allowedMentions: { repliedUser: false }
            });
        }
    }
};
