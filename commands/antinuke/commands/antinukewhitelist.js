const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, getUserFromMention, canConfigureAntinuke } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    if (!canConfigureAntinuke(message)) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **server owner** or **antinuke admins** can configure this.')
        ]
      });
    }
    if (args.length < 2) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}antinuke whitelist (user|bot)\`\`\``,
              '-# <:arrows:1457808531678957784> Exempts a user/bot from all **antinuke protection**.',
              '',
              `**Example:** \`${prefix}antinuke whitelist @luca\``,
              '\n**Aliases:** `N/A`'
            ].join('\n'))
        ]
      });
    }
    const user = await getUserFromMention(message, args[1]);
    
    if (!user) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **User/bot not found.**\n-# <:tree:1457808523986731008> Try using a mention (\`@user\`), user/bot ID, or make sure they're in this server.`)
        ]
      });
    }
    const config = getAntinukeConfig(message.guild.id);
    if (!config.whitelist) config.whitelist = [];
    if (config.whitelist.includes(user.id)) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${user.id}> is already **whitelisted**.`)
        ]
      });
    }

    // Show confirmation dialog
    const warningEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Whitelist User/Bot?')
      .setDescription([
        'This will **exempt** the user/bot from **all antinuke protection**, meaning:',
        '',
        '<:leese:1457834970486800567> They can perform actions without triggering **antinuke modules**',
        '<:leese:1457834970486800567> They will **not** be punished for **mass bans**, **kicks**, **role changes**, etc.',
        '<:tree:1457808523986731008> They can bypass **all** configured **protection thresholds**',
        '',
        '<:arrows:1457808531678957784> **Only whitelist trusted users/bots!**',
        '',
        '-# This is a **dangerous action**, use with **caution.**'
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
      components: [buttonRow],
      allowedMentions: { repliedUser: false }
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
              .setDescription('<:cr0ss:1457809446620369098> <:arrows:1457808531678957784> **Action cancelled.**')
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
                .setDescription(`<:cr0ss:1457809446620369098> <:arrows:1457808531678957784> <@${user.id}> is already **whitelisted**.`)
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
                `<:check:1457808518848581858> <:arrows:1457808531678957784> <@${user.id}> has been **added to the antinuke whitelist**.`
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
                .setDescription('<:cr0ss:1457809446620369098> <:arrows:1457808531678957784> **Confirmation timed out.**')
            ],
            components: []
          });
        } catch (err) {}
      }
    });
  }
};

