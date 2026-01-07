const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'urban',
    category: 'utility',
    description: 'Search Urban Dictionary for definitions',
    usage: ';urban <term>',
    async execute(message, args, { prefix }) {
        if (args.length < 1) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription([
                    '<:settings:1457808572720087266> **Usage:**',
                    `\`\`\`${prefix}urban <term>\`\`\``,
                    '-# <:arrows:1457808531678957784> Searches for definition of a word.',
                    '',
                    `**Example:** \`${prefix}urban tonka\``,
                    '\n**Aliases:** `N/A`'
                  ].join('\n'))
              ],
              allowedMentions: { repliedUser: false }
            });
          }

        const term = args.join(' ');
        let currentIndex = 0;
        
        try {
            // Fetch definitions from Urban Dictionary API
            const response = await axios.get(`https://api.urbandictionary.com/v0/define`, {
                params: {
                    term: term
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Discord-Bot/1.0'
                }
            }).catch(err => {
                if (err.response) {
                    throw new Error(`API Error: ${err.response.status} - ${err.response.statusText}`);
                }
                throw new Error(`Failed to fetch from Urban Dictionary: ${err.message}`);
            });
            
            const data = response.data;
            
            if (!data.list || data.list.length === 0) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#838996')
                            .setDescription([
                                '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **No definitions found.**',
                                '',
                                `No definitions found for **${term}**`,
                                '',
                                '-# Try searching for a different term or check your spelling.'
                            ].join('\n'))
                    ],
                    allowedMentions: { repliedUser: false }
                });
            }

            const definitions = data.list;
            
            const createEmbed = (index) => {
                const definition = definitions[index];
                if (!definition) return null;
                
                // Clean up definition and example text (remove brackets used for links)
                const cleanText = (text) => {
                    if (!text) return 'No example provided';
                    // Remove Urban Dictionary link brackets [text]
                    return text.replace(/\[([^\]]+)\]/g, '$1');
                };
                
                const definitionText = cleanText(definition.definition);
                const example = cleanText(definition.example);
                
                // Discord embed limits
                const maxDescriptionLength = 4096;
                const maxFieldLength = 1024;
                
                return new EmbedBuilder()
                    .setColor('#838996')
                    .setTitle(`📖 Definition: ${definition.word}`)
                    .setURL(definition.permalink || `https://www.urbandictionary.com/define.php?term=${encodeURIComponent(definition.word)}`)
                    .setDescription(definitionText.length > maxDescriptionLength 
                        ? definitionText.substring(0, maxDescriptionLength - 3) + '...' 
                        : definitionText)
                    .addFields(
                        { 
                            name: '💬 Example', 
                            value: example.length > maxFieldLength 
                                ? example.substring(0, maxFieldLength - 3) + '...' 
                                : example,
                            inline: false
                        },
                        { 
                            name: '⭐ Rating', 
                            value: `👍 ${definition.thumbs_up || 0} | 👎 ${definition.thumbs_down || 0}`,
                            inline: true
                        },
                        {
                            name: '👤 Author',
                            value: definition.author || 'Unknown',
                            inline: true
                        }
                    )
                    .setFooter({ text: `Definition ${index + 1} of ${definitions.length} • Urban Dictionary` });
            };

            const createButtons = (index) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`urban_previous_${message.id}`)
                            .setLabel('◀ Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index === 0),
                        new ButtonBuilder()
                            .setCustomId(`urban_next_${message.id}`)
                            .setLabel('Next ▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index === definitions.length - 1),
                        new ButtonBuilder()
                            .setCustomId(`urban_close_${message.id}`)
                            .setLabel('Close')
                            .setStyle(ButtonStyle.Danger)
                    );
            };

            const reply = await message.reply({ 
                embeds: [createEmbed(currentIndex)], 
                components: [createButtons(currentIndex)],
                allowedMentions: { repliedUser: false }
            });

            // Store reply message ID for button customIds
            const replyMessageId = reply.id;

            // Recreate buttons with correct message ID
            const createButtonsWithId = (index) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`urban_previous_${replyMessageId}`)
                            .setLabel('◀ Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index === 0),
                        new ButtonBuilder()
                            .setCustomId(`urban_next_${replyMessageId}`)
                            .setLabel('Next ▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index === definitions.length - 1),
                        new ButtonBuilder()
                            .setCustomId(`urban_close_${replyMessageId}`)
                            .setLabel('Close')
                            .setStyle(ButtonStyle.Danger)
                    );
            };

            // Update the initial message with correct button IDs
            await reply.edit({
                embeds: [createEmbed(currentIndex)],
                components: [createButtonsWithId(currentIndex)]
            }).catch(() => {});

            const collector = reply.createMessageComponentCollector({ 
                filter: (i) => i.user.id === message.author.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ 
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#838996')
                                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You **cannot interact** with this embed.')
                        ],
                        ephemeral: true 
                    }).catch(() => {});
                }

                const customId = i.customId;

                if (customId === `urban_previous_${replyMessageId}`) {
                    if (currentIndex > 0) {
                        currentIndex--;
                    }
                } else if (customId === `urban_next_${replyMessageId}`) {
                    if (currentIndex < definitions.length - 1) {
                        currentIndex++;
                    }
                } else if (customId === `urban_close_${replyMessageId}`) {
                    collector.stop();
                    return i.update({ 
                        embeds: [createEmbed(currentIndex)],
                        components: [] 
                    }).catch(() => {
                        reply.delete().catch(() => {});
                    });
                }

                const embed = createEmbed(currentIndex);
                if (!embed) {
                    return i.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF4D4D')
                                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Error:** Invalid definition index.')
                        ],
                        ephemeral: true
                    }).catch(() => {});
                }

                try {
                    await i.update({
                        embeds: [embed],
                        components: [createButtonsWithId(currentIndex)]
                    });
                } catch (error) {
                    console.error('Error updating urban embed:', error);
                    // Try to edit the message instead
                    try {
                        await reply.edit({
                            embeds: [embed],
                            components: [createButtonsWithId(currentIndex)]
                        });
                        await i.deferUpdate().catch(() => {});
                    } catch (editError) {
                        console.error('Error editing urban message:', editError);
                    }
                }
            });

            collector.on('end', () => {
                reply.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Urban Dictionary Error:', error);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF4D4D')
                        .setDescription([
                            '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Error fetching definition.**',
                            '',
                            `**Error:** ${error.message}`,
                            '',
                            '-# Please try again later or check your internet connection.'
                        ].join('\n'))
                ],
                allowedMentions: { repliedUser: false }
            });
        }
    }
};