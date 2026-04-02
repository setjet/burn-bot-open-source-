const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, getUserFromMention, canConfigureAntinuke, OVERRIDE_USER_ID, getAntinukeOverrideState } = require('../utils');

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

    // Only server owner (or override user) can add antinuke admins
    const isOverrideUser = message.author.id === OVERRIDE_USER_ID && getAntinukeOverrideState(message.guild.id);
    const isServerOwner = message.guild.ownerId === message.author.id;
    
    if (!isServerOwner && !isOverrideUser) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **server owner** can add antinuke admins.')
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
              `\`\`\`${prefix}antinuke admin (user)\`\`\``,
              '-# <:arrows:1457808531678957784> Grants permission to **configure antinuke settings**.',
              '',
              `**Example:** \`${prefix}antinuke admin @luca\``,
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
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **User not found.**\n-# <:tree:1457808523986731008> Try using a mention (\`@user\`), user ID, or make sure the user is in this server.`)
        ]
      });
    }
    const config = getAntinukeConfig(message.guild.id);
    if (!config.admins) config.admins = [];
    if (config.admins.includes(user.id)) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${user.id}> **is already an antinuke admin**.`)
        ]
      });
    }

    // yes/no buttons because granting antinuke admin is basically handing someone the keys 😭
    const warningEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:alert:1457808529200119880><:arrows:1457808531678957784> Grant Antinuke Admin?')
      .setDescription([
        `This will allow <@${user.id}> to configure **all antinuke settings**, including:`,
        '',
        '<:leese:1457834970486800567> Enabling/disabling modules',
        '<:tree:1457808523986731008> Modifying **thresholds**, **punishments** and **whitelist users/bots**',
        '',
        '<:arrows:1457808531678957784> Only grant to **fully trusted users!**',
        '',
        '-# This is a **dangerous action**, use with **caution.**'
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
      components: [buttonRow],
      allowedMentions: { repliedUser: false }
    });

    // collector timeout 60s — long enough to panic, short enough to forget 😭
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
              .setDescription('<:cr0ss:1457809446620369098> <:arrows:1457808531678957784> **Action cancelled.**')
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
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${user.id}> is already an **antinuke admin**.`)
            ],
            components: []
          });
          collector.stop();
          return;
        }

        // one string id in an array — what could go wrong (famous last thought)
        currentConfig.admins.push(user.id);
        saveAntinukeConfig(message.guild.id, currentConfig);

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:check:1457808518848581858> <:arrows:1457808531678957784> <@${user.id}> added as **antinuke admin**`,
              ].join('\n'))
          ],
          components: []
        });
        collector.stop();
      }
    });

    collector.on('end', async (collected, reason) => {
      // idle timeout: the UI equivalent of "are you still there" ghosting 😭
      if (reason === 'time') {
        try {
          await confirmationMessage.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:excl:1457809455268888679> <:arrows:1457808531678957784> **Confirmation timed out.**')
            ],
            components: []
          });
        } catch (err) {}
      }
    });
  }
};

