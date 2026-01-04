const { EmbedBuilder } = require('discord.js');
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

    // Only server owner (or override user) can remove antinuke admins
    const isOverrideUser = message.author.id === OVERRIDE_USER_ID && getAntinukeOverrideState(message.guild.id);
    const isServerOwner = message.guild.ownerId === message.author.id;
    
    if (!isServerOwner && !isOverrideUser) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Only the **server owner** can remove antinuke admins.')
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
              `\`\`\`${prefix}antinuke unadmin (user)\`\`\``,
              '',
              '-# Removes a user\'s permission to configure antinuke settings.'
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
    if (!config.admins.includes(user.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${user.id}> **is not an antinuke admin**.`)
        ]
      });
    }
    config.admins = config.admins.filter(id => id !== user.id);
    saveAntinukeConfig(message.guild.id, config);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:check:1362850043333316659> <:arrows:1363099226375979058> <@${user.id}> removed from **antinuke admins**`,
          ].join('\n'))
      ]
    });
  }
};

