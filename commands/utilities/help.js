const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
  name: 'help',
  aliases: ['h'],
  category: ['miscellaneous'],
  description: ['<:arrows:1457808531678957784> View all available commands.'],
  async execute(message, args, { prefix }) {

    // building categories from filesystem would have been smart; this map is stubbornly manual 😭
    const categoryOptions = [
      { label: 'utilities', value: 'utilities', emoji: '<:settings:1457808572720087266>' },
      { label: 'moderation', value: 'moderation', emoji: '<:moderation:1363214605987483759>' },
      { label: 'antinuke', value: 'antinuke', emoji: '<:sh1eld:1363214433136021948>' },
      { label: 'voicemaster', value: 'voicemaster', emoji: '🔊' },
      { label: 'miscellaneous', value: 'miscellaneous', emoji: '<:miscellaneous:1363962180101341344>' },
    ];

    const categorizedCommands = {};
    message.client.commands.forEach(cmd => {
      if (cmd.category === 'admin' || (Array.isArray(cmd.category) && cmd.category.includes('admin'))) return;

      let category = cmd.category || 'Uncategorized';
      if (Array.isArray(category)) {
        category = category[0];
      }
      if (!categorizedCommands[category]) categorizedCommands[category] = [];
      categorizedCommands[category].push(cmd);
    });
    // admin commands filtered out so randoms don't discover the scary panel from help 😭

    const helpEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:info:1457809654120714301> burn help')
      .setDescription([
        'Select a **category below** to see commands.',
        '',
        `**Prefix:** \`${prefix}\``,
        '-# <:leese:1457834970486800567> **Support server** link below.',
        '-# <:tree:1457808523986731008> Bot is in **Beta**.',
      ].join('\n'))
      .addFields(
        {
          name: '__Note:__',
          value: [
            '-# <:leese:1457834970486800567> Expect **occasional bugs**.',
            `-# <:tree:1457808523986731008> **[New features](${config.supportServerUrl})** added often.`,
          ].join('\n')
        }
      )
      .setThumbnail(message.client.user.displayAvatarURL({ size: 128, extension: 'png' }));

    const linkButtons = [
      new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(config.supportServerUrl)
    ];
    if (config.botWebsiteUrl) {
      linkButtons.push(
        new ButtonBuilder()
          .setLabel('Website')
          .setStyle(ButtonStyle.Link)
          .setURL(config.botWebsiteUrl)
      );
    }
    const helpLinksRow = new ActionRowBuilder().addComponents(linkButtons);

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help-menu')
      .setPlaceholder('select a category')
      .addOptions(categoryOptions.map(opt => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
        emoji: opt.emoji,
      })));

    const row = new ActionRowBuilder().addComponents(menu);

    const reply = await message.reply({
      embeds: [helpEmbed],
      components: [row, helpLinksRow],
      allowedMentions: { repliedUser: false }
    });

    let activeCollector = null;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === message.author.id,
    });
    // if someone else clicks: silence — learned after public humiliation in test server 😭

    collector.on('collect', async interaction => {
      const category = interaction.values[0];
      const commands = categorizedCommands[category] || [];

      let page = 0;
      const pageSize = 5;
      const totalPages = Math.ceil(commands.length / pageSize);
      // 5 commands per page so embeds don't explode — discord's character limit is a bully 😭

      const getPageEmbed = () => {
        const start = page * pageSize;
        const end = start + pageSize;
        const pageCommands = commands.slice(start, end);

        const embed = new EmbedBuilder().setColor('#838996');
        if (pageCommands.length === 0) {
          embed.setDescription(`No commands found in the **${category}** category.`);
        } else {
          embed.setDescription([
            `**${category}** (Page ${page + 1}/${totalPages})`,
            ...pageCommands.map(cmd => `[ \`${prefix}${cmd.name}\` ](${config.supportServerUrl})\n${cmd.description || '*No description*'}`)
          ].join('\n\n'));
        }
        return embed;
      };

      if (totalPages <= 1) {
        const backToMenuBtn = new ButtonBuilder()
          .setCustomId('back_to_menu')
          .setLabel('Back to Menu')
          .setStyle(ButtonStyle.Primary);

        const singlePageButtons = new ActionRowBuilder().addComponents(backToMenuBtn);
        
        try {
          await interaction.update({
            embeds: [getPageEmbed()],
            components: [row, singlePageButtons],
          });
        } catch (err) {
          // discord loves expiring interactions mid-click; fallback edit keeps the help alive 😭
          await reply.edit({
            embeds: [getPageEmbed()],
            components: [row, singlePageButtons],
          }).catch(() => null);
        }
        
        // Set up collector for back to menu button
        const singlePageCollector = reply.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter: i => i.user.id === message.author.id && i.message.id === reply.id && i.customId === 'back_to_menu',
          time: 120000,
        });

        singlePageCollector.on('collect', async btn => {
          try {
            await btn.update({
              embeds: [helpEmbed],
              components: [row, helpLinksRow],
            });
          } catch (err) {
            await reply.edit({
              embeds: [helpEmbed],
              components: [row, helpLinksRow],
            }).catch(() => null);
          }
        });
        
        return;
      }

      const backBtn = new ButtonBuilder()
        .setCustomId('prev')
        .setEmoji('1457809457193947421') 
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const nextBtn = new ButtonBuilder()
        .setCustomId('next')
        .setEmoji('1457809458804686858') 
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1);

      const closeBtn = new ButtonBuilder()
        .setCustomId('close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger);

      const backToMenuBtn = new ButtonBuilder()
        .setCustomId('back_to_menu')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Primary);

      const buttons = new ActionRowBuilder().addComponents(backBtn, nextBtn, backToMenuBtn, closeBtn);

      try {
        await interaction.update({
          embeds: [getPageEmbed()],
          components: [row, buttons],
        });
      } catch (err) {
        // Interaction expired, edit message instead
        await reply.edit({
          embeds: [getPageEmbed()],
          components: [row, buttons],
        }).catch(() => null);
        return;
      }

      if (activeCollector) activeCollector.stop();

      const buttonCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === message.author.id && i.message.id === reply.id,
        time: 120000,
      });

      activeCollector = buttonCollector;

      buttonCollector.on('collect', async btn => {
        try {
          if (btn.customId === 'close') {
            await reply.delete().catch(() => null);
            return;
          }

          if (btn.customId === 'back_to_menu') {
            try {
              await btn.update({
                embeds: [helpEmbed],
                components: [row, helpLinksRow],
              });
            } catch (err) {
              await reply.edit({
                embeds: [helpEmbed],
                components: [row, helpLinksRow],
              }).catch(() => null);
            }
            return;
          }

          if (btn.customId === 'prev') {
            page = Math.max(0, page - 1);
          } else if (btn.customId === 'next') {
            page = Math.min(totalPages - 1, page + 1);
          }

          backBtn.setDisabled(page === 0);
          nextBtn.setDisabled(page >= totalPages - 1);

          try {
            await btn.update({
              embeds: [getPageEmbed()],
              components: [row, new ActionRowBuilder().addComponents(backBtn, nextBtn, backToMenuBtn, closeBtn)],
            });
          } catch (err) {
            // Interaction expired, edit message instead
            await reply.edit({
              embeds: [getPageEmbed()],
              components: [row, new ActionRowBuilder().addComponents(backBtn, nextBtn, backToMenuBtn, closeBtn)],
            }).catch(() => null);
          }
        } catch (err) {
          console.error('Button update failed:', err);
        }
      });

      buttonCollector.on('end', () => { });
    });

    message.client.on('interactionCreate', async i => {
      if (
        i.isStringSelectMenu() &&
        i.customId === 'help-menu' &&
        i.message.id === reply.id &&
        i.user.id !== message.author.id
      ) {
        await i.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You **cannot interact** with this embed.')
          ]
        });
      }
    });
  }
};