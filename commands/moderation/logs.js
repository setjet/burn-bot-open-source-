const { EmbedBuilder, PermissionsBitField, Events, ChannelType } = require('discord.js');
const { dbHelpers, db } = require('../../db');

module.exports = {
  name: 'logs',
  aliases: ['log'],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Manage server logging system.',
  async execute(message, args, { prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Guild** permissions to use this command.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const subcommand = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}logs (subcommand) (args)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `channel <#channel>` - Set the logging channel',
          '<:leese:1457834970486800567> `toggle` or `on/off` - Enable/disable logging system',
          '<:leese:1457834970486800567> `toggle <event>` - Toggle specific log events',
          '<:leese:1457834970486800567> `view` - View current logging settings',
          '<:leese:1457834970486800567> `events` - List all available log events',
          '<:tree:1457808523986731008> `remove` - Remove logging configuration',
          '',
          '**Aliases:** `log`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Available log events
    const availableEvents = [
      'member_join',
      'member_leave',
      'member_ban',
      'member_unban',
      'member_kick',
      'member_timeout',
      'member_untimeout',
      'message_delete',
      'message_edit',
      'role_create',
      'role_delete',
      'role_update',
      'channel_create',
      'channel_delete',
      'channel_update'
    ];

    // View current settings
    if (subcommand === 'view') {
      const config = dbHelpers.getLoggingConfig(guildId);
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No logging channel has been set.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const channel = message.guild.channels.cache.get(config.channelId);
      const channelField = channel ? `${channel}` : 'Channel not found';
      const eventsList = config.logEvents.length > 0 
        ? config.logEvents.map(e => `\`${e}\``).join(', ')
        : 'None enabled';

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Logging Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Channel', value: channelField, inline: true },
          { name: 'Enabled Events', value: eventsList || 'None', inline: false }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // List available events
    if (subcommand === 'events') {
      const eventsEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Available Log Events')
        .setDescription([
          '**Member Events:**',
          '<:leese:1457834970486800567> `member_join` - When a member joins',
          '<:leese:1457834970486800567> `member_leave` - When a member leaves',
          '<:leese:1457834970486800567> `member_ban` - When a member is banned',
          '<:leese:1457834970486800567> `member_unban` - When a member is unbanned',
          '<:leese:1457834970486800567> `member_kick` - When a member is kicked',
          '<:leese:1457834970486800567> `member_timeout` - When a member is timed out',
          '<:tree:1457808523986731008> `member_untimeout` - When a timeout is removed',
          '',
          '**Message Events:**',
          '<:leese:1457834970486800567> `message_delete` - When a message is deleted',
          '<:tree:1457808523986731008> `message_edit` - When a message is edited',
          '',
          '**Role Events:**',
          '<:leese:1457834970486800567> `role_create` - When a role is created',
          '<:leese:1457834970486800567> `role_delete` - When a role is deleted',
          '<:tree:1457808523986731008> `role_update` - When a role is updated',
          '',
          '**Channel Events:**',
          '<:leese:1457834970486800567> `channel_create` - When a channel is created',
          '<:leese:1457834970486800567> `channel_delete` - When a channel is deleted',
          '<:tree:1457808523986731008> `channel_update` - When a channel is updated'
        ].join('\n'));

      return message.reply({
        embeds: [eventsEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Set logging channel
    if (subcommand === 'channel') {
      const channelMention = args[1];
      
      if (!channelMention) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}logs channel <#channel>\`\`\``,
                '-# <:arrows:1457808531678957784> Set the channel where logs will be sent.',
                '',
                `**Example:** \`${prefix}logs channel #logs\``,
                '',
                '**Aliases:** `log`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const channelId = channelMention.replace(/[<#>]/g, '');
      const channel = message.guild.channels.cache.get(channelId);
      
      if (!channel) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Channel not found. Please mention a valid channel.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (channel.type !== ChannelType.GuildText) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please select a text channel.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const existingConfig = dbHelpers.getLoggingConfig(guildId);
      const existingEvents = existingConfig ? existingConfig.logEvents : [];

      dbHelpers.setLoggingConfig(guildId, channelId, true, existingEvents);

      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Logging channel has been set to ${channel} and **enabled**.\n -# <:tree:1457808523986731008> Use \`${prefix}logs toggle <event>\` to enable specific events.`);

      return message.reply({
        embeds: [successEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Toggle on/off for entire system (check this first)
    if (subcommand === 'on' || subcommand === 'off') {
      const config = dbHelpers.getLoggingConfig(guildId);
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to set a logging channel first using \`${prefix}logs channel <#channel>\`.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const enabled = subcommand === 'on';
      dbHelpers.setLoggingConfig(guildId, config.channelId, enabled, config.logEvents || []);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(enabled
              ? '<:check:1457808518848581858> <:arrows:1457808531678957784> Logging system is now **enabled**.'
              : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Logging system is now **disabled**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Toggle enable/disable entire logging system (when no event specified)
    if (subcommand === 'toggle' && !args[1]) {
      const config = dbHelpers.getLoggingConfig(guildId);
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to set a logging channel first using \`${prefix}logs channel <#channel>\`.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const newEnabled = !config.enabled;
      dbHelpers.setLoggingConfig(guildId, config.channelId, newEnabled, config.logEvents || []);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(newEnabled
              ? '<:check:1457808518848581858> <:arrows:1457808531678957784> Logging system is now **enabled**.'
              : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Logging system is now **disabled**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Toggle specific log events (when event is specified)
    if (subcommand === 'toggle' && args[1]) {
      const event = args[1]?.toLowerCase();
      
      if (!availableEvents.includes(event)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid event. Use \`${prefix}logs events\` to see all available events.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const config = dbHelpers.getLoggingConfig(guildId);
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to set a logging channel first using \`${prefix}logs channel <#channel>\`.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const currentEvents = config.logEvents || [];
      const isEnabled = currentEvents.includes(event);
      
      let newEvents;
      if (isEnabled) {
        newEvents = currentEvents.filter(e => e !== event);
      } else {
        newEvents = [...currentEvents, event];
      }

      dbHelpers.setLoggingConfig(guildId, config.channelId, config.enabled, newEvents);

      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(isEnabled
          ? `<:check:1457808518848581858> <:arrows:1457808531678957784> Log event \`${event}\` has been **disabled**.`
          : `<:check:1457808518848581858> <:arrows:1457808531678957784> Log event \`${event}\` has been **enabled**.`);

      return message.reply({
        embeds: [successEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Remove logging
    if (subcommand === 'remove') {
      const config = dbHelpers.getLoggingConfig(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No logging configuration to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      db.prepare('DELETE FROM logging_config WHERE guild_id = ?').run(guildId);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Logging configuration has been **removed**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. \n -# <:tree:1457808523986731008> Use `channel`, `toggle`, `view`, `events`, or `remove`.')
      ],
      allowedMentions: { repliedUser: false }
    });
  },

  setup: (client) => {
    // Member join
    client.on(Events.GuildMemberAdd, async (member) => {
      const config = dbHelpers.getLoggingConfig(member.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('member_join')) return;

      try {
        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`<@${member.id}> joined the server`)
          .addFields({ name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Member leave
    client.on(Events.GuildMemberRemove, async (member) => {
      const config = dbHelpers.getLoggingConfig(member.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('member_leave')) return;

      try {
        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`<@${member.id}> left the server`)
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Message delete
    client.on(Events.MessageDelete, async (message) => {
      if (!message.guild || message.author?.bot) return;
      const config = dbHelpers.getLoggingConfig(message.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('message_delete')) return;

      try {
        const channel = message.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setDescription(`Message deleted in ${message.channel}`)
          .addFields({ name: 'Content', value: message.content || '*No content*', inline: false })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Message edit
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
      const config = dbHelpers.getLoggingConfig(newMessage.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('message_edit')) return;

      try {
        const channel = newMessage.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
          .setDescription(`Message edited in ${newMessage.channel}`)
          .addFields(
            { name: 'Before', value: oldMessage.content || '*No content*', inline: false },
            { name: 'After', value: newMessage.content || '*No content*', inline: false }
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });
  }
};

