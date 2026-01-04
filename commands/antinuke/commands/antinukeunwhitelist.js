const { EmbedBuilder } = require('discord.js');
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
              `\`\`\`${prefix}antinuke unwhitelist (user|bot)\`\`\``,
              '',
              '-# Removes a user or bot from the antinuke whitelist.'
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
    if (!config.whitelist.includes(user.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${user.id}> **is not whitelisted**.`)
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
            `<:check:1362850043333316659> <:arrows:1363099226375979058> **<@${user.id}> Successfully removed from whitelist.**`,
          ].join('\n'))
      ]
    });
  }
};

