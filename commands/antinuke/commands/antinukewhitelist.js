const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, getUserFromMention, canConfigureAntinuke } = require('../utils');

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
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Invalid usage.**',
              '',
              '**Usage:**',
              `\`\`\`${prefix}antinuke whitelist (user|bot)\`\`\``,
              '',
              '-# Exempts a user or bot from all antinuke protection.'
            ].join('\n'))
        ]
      });
    }
    let user = getUserFromMention(message, args[1]);
    
    // If not found in cache, try fetching by ID
    if (!user && /^\d{17,19}$/.test(args[1])) {
      try {
        user = await message.client.users.fetch(args[1]).catch(() => null);
      } catch (error) {
        // Ignore fetch errors
      }
    }
    
    if (!user) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **User or bot not found.**')
        ]
      });
    }
    const config = getAntinukeConfig(message.guild.id);
    if (!config.whitelist) config.whitelist = [];
    if (config.whitelist.includes(user.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${user.id}> is already **whitelisted**.`)
        ]
      });
    }

    // Show confirmation dialog
    const warningEmbed = new EmbedBuilder()
      .setColor('#FF4D4D')
      .setTitle('<:excl:1362858572677120252> Whitelist User/Bot?')
      .setDescription([
        'This will **exempt** the user/bot from **all antinuke protection**, meaning:',
        '• They can perform actions without triggering **antinuke modules**',
        '• They will **not** be punished for **mass bans**, **kicks**, **role changes**, etc.',
        '• They can bypass **all** configured **protection thresholds**',
        '',
        '**Only whitelist trusted users/bots!**',
        '',
        '-# Click **Yes** to confirm or **No** to cancel.'
      ].join('\n'))

    const yesButton = new ButtonBuilder()
      .setCustomId('antinuke-whitelist-confirm-yes')
      .setLabel('Yes')
      .setStyle(ButtonStyle.Danger);

    const noButton = new ButtonBuilder()
      .setCustomId('antinuke-whitelist-confirm-no')
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
      if (interaction.customId === 'antinuke-whitelist-confirm-no') {
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

      if (interaction.customId === 'antinuke-whitelist-confirm-yes') {
        // Double-check user still exists and isn't already whitelisted
        const currentConfig = getAntinukeConfig(message.guild.id);
        if (!currentConfig.whitelist) currentConfig.whitelist = [];
        
        if (currentConfig.whitelist.includes(user.id)) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${user.id}> is already **whitelisted**.`)
            ],
            components: []
          });
          collector.stop();
          return;
        }

        // Add user to whitelist
        currentConfig.whitelist.push(user.id);
        saveAntinukeConfig(message.guild.id, currentConfig);

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:check:1362850043333316659> <:arrows:1363099226375979058> <@${user.id}> has been **added to the antinuke whitelist**.`
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

