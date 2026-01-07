const { EmbedBuilder } = require('discord.js');
const { getAntinukeConfig, saveAntinukeConfig, canConfigureAntinuke, OVERRIDE_USER_ID, getAntinukeOverrideState } = require('../utils');

module.exports = {
  category: ['antinuke'],
  execute: async (message, args, { prefix }) => {
    if (!canConfigureAntinuke(message)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **server owner** or **antinuke admins** can configure this.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (!args.length) {
      const config = getAntinukeConfig(message.guild.id);
      const currentChannel = config.logChannel ? `<#${config.logChannel}>` : 'Not set';
      
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Invalid usage.**',
              '',
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}antinuke log (channel)\`\`\``,
              '',
              '-# (This could be an error, Ignore it and try again.)'
            ].join('\n'))
        ]
      });
    }

    // Get channel input for error messages
    const channelInput = args.join(' ').trim();
    
    // First, check if there's a channel mention in the message
    let channel = message.mentions.channels.first();
    
    // If no mention, try to parse from args
    if (!channel) {
      // Get channel from mention, ID, or name
      // Handle cases like "log # log" or "log #log" or just "log"
      let processedInput = channelInput;
      // Remove standalone # symbols and clean up
      processedInput = processedInput.replace(/\s*#\s*/g, ' ').trim();
      // If it starts with #, remove it
      if (processedInput.startsWith('#')) {
        processedInput = processedInput.slice(1).trim();
      }
      
      // Try to get channel from mention format
      if (processedInput.startsWith('<#') && processedInput.endsWith('>')) {
        const channelId = processedInput.slice(2, -1);
        channel = await message.guild.channels.fetch(channelId).catch(() => null);
      } else if (/^\d+$/.test(processedInput)) {
        // Try as ID (numeric only)
        channel = await message.guild.channels.fetch(processedInput).catch(() => null);
      } else {
        // Try to find by name (case-insensitive)
        const searchName = processedInput.toLowerCase().trim();
        
        // First try exact match in cache
        channel = message.guild.channels.cache.find(
          ch => ch.name.toLowerCase() === searchName && ch.isTextBased() && ch.viewable
        );
        
        // If not found, try partial match in cache
        if (!channel) {
          channel = message.guild.channels.cache.find(
            ch => ch.name.toLowerCase().includes(searchName) && ch.isTextBased() && ch.viewable
          );
        }
        
        // If still not found, try fetching all channels and searching
        if (!channel) {
          try {
            const channels = await message.guild.channels.fetch();
            channel = channels.find(
              ch => (ch.name.toLowerCase() === searchName || ch.name.toLowerCase().includes(searchName)) && ch.isTextBased() && ch.viewable
            );
          } catch (err) {
            // Fetch failed, continue with null
          }
        }
      }
    }

    if (!channel) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}antinuke log (channel)\`\`\``,
              '-# <:arrows:1457808531678957784> Sets channel for antinuke logs.',
              '',
              `**Example:** \`${prefix}antinuke log #antinuke-log\``,
              '\n**Aliases:** `N/A`'
            ].join('\n'))
        ]
      });
    }

    // Check if channel is text-based
    if (!channel.isTextBased()) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Invalid** channel type, **Try again**.')
        ]
      });
    }

    // Check bot permissions in the channel
    const botMember = message.guild.members.me;
    const permissions = channel.permissionsFor(botMember);
    if (!permissions || !permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:excl:1457809455268888679> <:arrows:1457808531678957784> **Missing permissions.**',
              '',
              `The bot needs **View Channel**, **Send Messages**, and **Embed Links** permissions in ${channel}.`,
              '',
              '-# Grant these **permissions** and try again.'
            ].join('\n'))
        ]
      });
    }

    // Check if log channel is already set
    const config = getAntinukeConfig(message.guild.id);
    if (config.logChannel) {
      // Check if trying to set the same channel
      if (config.logChannel === channel.id) {
        return message.reply({
        allowedMentions: { repliedUser: false },
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Log channel is already set to ${channel}.**`,
              ].join('\n'))
          ]
        });
      }
      
      // If different channel, show current and ask for confirmation or just update
      // For now, we'll just update it but show a message
      const currentChannel = message.guild.channels.cache.get(config.logChannel);
      const currentChannelMention = currentChannel ? currentChannel.toString() : 'Unknown channel';
      
      // Update the log channel
      config.logChannel = channel.id;
      saveAntinukeConfig(message.guild.id, config);
      
      return message.reply({
        allowedMentions: { repliedUser: false },
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:check:1457808518848581858> <:arrows:1457808531678957784> **Log channel updated** from ${currentChannelMention} to ${channel}.`,
            ].join('\n'))
        ]
      });
    }

    // Save log channel (first time setting)
    config.logChannel = channel.id;
    saveAntinukeConfig(message.guild.id, config);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            `<:check:1457808518848581858> <:arrows:1457808531678957784> **Log channel** has been set to ${channel}`,
          ].join('\n'))
      ]
    });
  }
};

