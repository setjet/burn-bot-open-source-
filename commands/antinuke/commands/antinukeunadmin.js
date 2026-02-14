const { EmbedBuilder } = require('discord.js');
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
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784>  Only the **server owner** or **antinuke admins** can configure this.')
        ]
      });
    }

    // Only server owner (or override user) can remove antinuke admins
    const isOverrideUser = message.author.id === OVERRIDE_USER_ID && getAntinukeOverrideState(message.guild.id);
    const isServerOwner = message.guild.ownerId === message.author.id;
    
    if (!isServerOwner && !isOverrideUser) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **server owner** can remove antinuke admins.')
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
              `\`\`\`${prefix}antinuke unadmin (user)\`\`\``,
              '-# <:arrows:1457808531678957784> Removes user from antinuke admins.',
              '',
              `**Example:** \`${prefix}antinuke unadmin @luca\``,
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
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **User not found.**\n-# Try using a mention (\`@user\`), user ID, or make sure the user is in this server.`)
        ]
      });
    }
    const config = getAntinukeConfig(message.guild.id);
    if (!config.admins) config.admins = [];
    if (!config.admins.includes(user.id)) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${user.id}> is not an **antinuke admin**.`)
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
            `<:check:1457808518848581858> <:arrows:1457808531678957784> <@${user.id}> removed from **antinuke admins**`,
          ].join('\n'))
      ]
    });
  }
};

