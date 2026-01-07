const { EmbedBuilder } = require('discord.js');
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
              `\`\`\`${prefix}antinuke unwhitelist (user|bot)\`\`\``,
              '-# <:arrows:1457808531678957784> Removes a user or bot from whitelist.',
              '',
              `**Example:** \`${prefix}antinuke unwhitelist @jet\``,
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
            .setDescription(`<:excl:1457809455268888679> <:arrows:1457808531678957784> **User/bot not found.**\n-# <:tree:1457808523986731008> Try using a mention (\`@user\`), user ID, or make sure they're in this server.`)
        ]
      });
    }
    const config = getAntinukeConfig(message.guild.id);
    if (!config.whitelist) config.whitelist = [];
    if (!config.whitelist.includes(user.id)) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${user.id}> **is not whitelisted**`)
        ]
      });
    }
    config.whitelist = config.whitelist.filter(id => id !== user.id);
    saveAntinukeConfig(message.guild.id, config);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:check:1457808518848581858> <:arrows:1457808531678957784> Successfully removed <@${user.id}> from **whitelist**`,
          ].join('\n'))
      ]
    });
  }
};

