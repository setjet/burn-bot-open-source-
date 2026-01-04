const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, getUserFromMention, canConfigureAntinuke, OVERRIDE_USER_ID, getAntinukeOverrideState } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    if (!canConfigureAntinuke(message)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Only the **server owner** or **antinuke admins** can configure this.')
        ]
      });
    }

    // Only server owner (or override user) can add antinuke admins
    const isOverrideUser = message.author.id === OVERRIDE_USER_ID && getAntinukeOverrideState(message.guild.id);
    const isServerOwner = message.guild.ownerId === message.author.id;
    
    if (!isServerOwner && !isOverrideUser) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Only the **server owner** can add antinuke admins.')
        ]
      });
    }

    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Invalid usage.**',
              '',
              '**Usage:**',
              `\`\`\`${prefix}antinuke admin (user)\`\`\``,
              '',
              '-# Grants a user permission to configure antinuke settings.'
            ].join('\n'))
        ]
      });
    }
    const user = getUserFromMention(message, args[1]);
    if (!user) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **User not found.**')
        ]
      });
    }
    const config = getAntinukeConfig(message.guild.id);
    if (!config.admins) config.admins = [];
    if (config.admins.includes(user.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${user.id}> **is already an antinuke admin**.`)
        ]
      });
    }

    // Show confirmation dialog
    const warningEmbed = new EmbedBuilder()
      .setColor('#FF4D4D')
      .setTitle('<:excl:1362858572677120252> Grant Antinuke Admin?')
      .setDescription([
        'This will allow the user to configure **all antinuke settings**, including:',
        '• Enabling/disabling modules',
        '• Modifying **thresholds**, **punishments**, **admins**, and **whitelist**',
        '',
        'Only grant to **fully trusted users!**',
        '',
        '-# Click **Yes** to confirm or **No** to cancel.'
      ].join('\n'))

    const yesButton = new ButtonBuilder()
      .setCustomId('antinuke-admin-confirm-yes')
      .setLabel('Yes')
      .setStyle(ButtonStyle.Danger);

    const noButton = new ButtonBuilder()
      .setCustomId('antinuke-admin-confirm-no')
      .setLabel('No')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(yesButton, noButton);

    const confirmationMessage = await message.reply({
      embeds: [warningEmbed],
      components: [buttonRow]
    });

    // Create collector for button interactions
    const collector = confirmationMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 60000 // 60 seconds
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'antinuke-admin-confirm-no') {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **Action cancelled.**')
          ],
          components: []
        });
        collector.stop();
        return;
      }

      if (interaction.customId === 'antinuke-admin-confirm-yes') {
        // Double-check user still exists and isn't already an admin
        const currentConfig = getAntinukeConfig(message.guild.id);
        if (!currentConfig.admins) currentConfig.admins = [];
        
        if (currentConfig.admins.includes(user.id)) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${user.id}> is already an **antinuke admin**.`)
            ],
            components: []
          });
          collector.stop();
          return;
        }

        // Add user as admin
        currentConfig.admins.push(user.id);
        saveAntinukeConfig(message.guild.id, currentConfig);

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:check:1362850043333316659> <:arrows:1363099226375979058> <@${user.id}> added as **antinuke admin**`,
              ].join('\n'))
          ],
          components: []
        });
        collector.stop();
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        try {
          await confirmationMessage.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **Confirmation timed out.**')
            ],
            components: []
          });
        } catch (err) {}
      }
    });
  }
};

