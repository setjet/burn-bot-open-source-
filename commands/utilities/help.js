const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  aliases: ['h'],
  category: ['miscellaneous'],
  description: ['<:arrows:1363099226375979058> View all available commands.'],
  async execute(message, args, { prefix }) {

    const categoryOptions = [
      { label: 'utilities', value: 'utilities', emoji: '<:settings:1362876382375317565>' },
      { label: 'moderation', value: 'moderation', emoji: '<:moderation:1363214605987483759>' },
      { label: 'antinuke', value: 'antinuke', emoji: '<:sh1eld:1363214433136021948>' },
      { label: 'miscellaneous', value: 'miscellaneous', emoji: '<:miscellaneous:1363962180101341344>' },
    ];

    const categorizedCommands = {};
    message.client.commands.forEach(cmd => {
      // Exclude admin commands from help
      if (cmd.category === 'admin' || (Array.isArray(cmd.category) && cmd.category.includes('admin'))) return;
      
      // Handle both string and array categories
      let category = cmd.category || 'Uncategorized';
      if (Array.isArray(category)) {
        category = category[0]; // Use first category if array
      }
      if (!categorizedCommands[category]) categorizedCommands[category] = [];
      categorizedCommands[category].push(cmd);
    });

    const helpEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('burn help')
      .setDescription('select a category from the dropdown to view available commands.')
      .addFields({ name: '', value: '-# bot still in beta, expect occasional bugs.' });

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
      components: [row],
    });

    let activeCollector = null;

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === message.author.id,
    });

    collector.on('collect', async interaction => {
      const category = interaction.values[0];
      const commands = categorizedCommands[category] || [];

      let page = 0;
      const pageSize = 5; // Changed from 10 to 5 commands per page
      const totalPages = Math.ceil(commands.length / pageSize);

      const getPageEmbed = () => {
        const start = page * pageSize;
        const end = start + pageSize;
        const pageCommands = commands.slice(start, end);

        const embed = new EmbedBuilder().setColor('#838996');
        if (pageCommands.length === 0) {
          embed.setDescription(`No commands found in the **${category}** category.`);
        } else {
          embed.setDescription([
            `**${category}** (Page ${page + 1}/${totalPages})`, // Reduced spacing here
            ...pageCommands.map(cmd => `\`• ${prefix}${cmd.name}\`\n${cmd.description || '*No description*'}`)
          ].join('\n\n'));
        }
        return embed;
      };

      if (totalPages <= 1) {
        try {
          await interaction.update({
            embeds: [getPageEmbed()],
            components: [row],
          });
        } catch (err) {
          // Interaction expired, edit message instead
          await reply.edit({
            embeds: [getPageEmbed()],
            components: [row],
          }).catch(() => null);
        }
        return;
      }

      const backBtn = new ButtonBuilder()
        .setCustomId('prev')
        .setEmoji('1363819173792321576') 
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const nextBtn = new ButtonBuilder()
        .setCustomId('next')
        .setEmoji('1363819150169866250') 
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1);

      const closeBtn = new ButtonBuilder()
        .setCustomId('close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger);

      const buttons = new ActionRowBuilder().addComponents(backBtn, nextBtn, closeBtn);

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
              components: [row, new ActionRowBuilder().addComponents(backBtn, nextBtn, closeBtn)],
            });
          } catch (err) {
            // Interaction expired, edit message instead
            await reply.edit({
              embeds: [getPageEmbed()],
              components: [row, new ActionRowBuilder().addComponents(backBtn, nextBtn, closeBtn)],
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
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You **cannot interact** with this embed.')
          ]
        });
      }
    });
  }
};