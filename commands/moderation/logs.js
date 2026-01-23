const { EmbedBuilder, PermissionsBitField, Events, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { dbHelpers, db } = require('../../db');

const DEFAULT_PREFIX = ',';

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Store active collectors and message states
const activeCollectors = new Map();
const messageStates = new Map(); // messageId -> { view: 'main' | 'config', guildId, userId }

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

// Helper: Build main menu embed
function buildMainMenuEmbed(guildId) {
  const { dbHelpers } = require('../../db');
  const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;
  const config = dbHelpers.getLoggingConfig(guildId) || {
    enabled: false,
    channelId: null,
    logEvents: []
  };

  const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
  const channel = config.channelId ? `<#${config.channelId}>` : '`Not set`';
  const eventsCount = config.logEvents ? config.logEvents.length : 0;

  return new EmbedBuilder()
    .setColor('#838996')
    .setTitle('<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Logging System')
    .setDescription([
      '<:clicks:1457865474321944659> **Interactive Setup**',
      '',
      'Configure logging settings using the dropdowns below.',
      '',
      '<:settings:1457808572720087266> **Current Settings:**',
      `<:leese:1457834970486800567> **Status:** ${status}`,
      `<:leese:1457834970486800567> **Channel:** ${channel}`,
      `<:tree:1457808523986731008> **Enabled Events:** \`${eventsCount}\``,
      '',
      '-# <:arrows:1457808531678957784> All changes are saved **automatically**!'
    ].join('\n'));
}

// Helper: Build main menu components
function buildMainMenuComponents(config) {
  if (!config) {
    config = {
      enabled: false,
      channelId: null,
      logEvents: []
    };
  }

  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId('logs-status')
    .setPlaceholder(`Status: ${config.enabled ? 'Enabled' : 'Disabled'}`)
    .addOptions([
      { label: 'Enable', value: 'on', description: 'Enable logging system' },
      { label: 'Disable', value: 'off', description: 'Disable logging system' }
    ]);

  // Events organized into 2 dropdowns to stay within Discord's 5-row limit
  // Combine member + message events, and role + channel events
  const memberEvents = ['member_join', 'member_leave', 'member_ban', 'member_unban', 'member_kick', 'member_timeout', 'member_untimeout'];
  const messageEvents = ['message_delete', 'message_edit'];
  const roleEvents = ['role_create', 'role_delete', 'role_update'];
  const channelEvents = ['channel_create', 'channel_delete', 'channel_update'];

  const eventLabels = {
    'member_join': 'Member Join',
    'member_leave': 'Member Leave',
    'member_ban': 'Member Ban',
    'member_unban': 'Member Unban',
    'member_kick': 'Member Kick',
    'member_timeout': 'Member Timeout',
    'member_untimeout': 'Member Untimeout',
    'message_delete': 'Message Delete',
    'message_edit': 'Message Edit',
    'role_create': 'Role Create',
    'role_delete': 'Role Delete',
    'role_update': 'Role Update',
    'channel_create': 'Channel Create',
    'channel_delete': 'Channel Delete',
    'channel_update': 'Channel Update'
  };

  // First dropdown: Member & Message events (9 total)
  const memberMessageSelect = new StringSelectMenuBuilder()
    .setCustomId('logs-events-member-message')
    .setPlaceholder('Member & Message Events (select multiple)')
    .setMinValues(0)
    .setMaxValues(9)
    .addOptions([...memberEvents, ...messageEvents].map(event => ({
      label: eventLabels[event],
      value: event,
      description: `Toggle ${eventLabels[event]} logging`,
      default: config.logEvents && config.logEvents.includes(event)
    })));

  // Second dropdown: Role & Channel events (6 total)
  const roleChannelSelect = new StringSelectMenuBuilder()
    .setCustomId('logs-events-role-channel')
    .setPlaceholder('Role & Channel Events (select multiple)')
    .setMinValues(0)
    .setMaxValues(6)
    .addOptions([...roleEvents, ...channelEvents].map(event => ({
      label: eventLabels[event],
      value: event,
      description: `Toggle ${eventLabels[event]} logging`,
      default: config.logEvents && config.logEvents.includes(event)
    })));

  const statusRow = new ActionRowBuilder().addComponents(statusSelect);
  const memberMessageRow = new ActionRowBuilder().addComponents(memberMessageSelect);
  const roleChannelRow = new ActionRowBuilder().addComponents(roleChannelSelect);

  const manageButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('logs-channel')
        .setLabel('Set Channel')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('logs-view')
        .setLabel('View Config')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('logs-events-list')
        .setLabel('List Events')
        .setStyle(ButtonStyle.Secondary)
    );

  // Only add Reset button if there's configuration
  if (config && (config.channelId || (config.logEvents && config.logEvents.length > 0) || config.enabled)) {
    manageButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('logs-reset')
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger)
    );
  }

  return [statusRow, memberMessageRow, roleChannelRow, manageButtons];
}

// Unified interaction handler
async function handleInteraction(interaction, config, guildId) {
  if (interaction.replied || interaction.deferred) return;

  const messageId = interaction.message.id;
  const state = messageStates.get(messageId) || { view: 'main', guildId, userId: interaction.user.id };

  // Handle dropdown selections
  if (interaction.isStringSelectMenu()) {
    const currentConfig = dbHelpers.getLoggingConfig(guildId) || {
      enabled: false,
      channelId: null,
      logEvents: []
    };

    if (interaction.customId === 'logs-status') {
      const value = interaction.values[0];
      if (!currentConfig.channelId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to set a logging channel first using the **Set Channel** button.')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        return;
      }
      currentConfig.enabled = value === 'on';
      dbHelpers.setLoggingConfig(guildId, currentConfig.channelId, currentConfig.enabled, currentConfig.logEvents || []);
    } else if (interaction.customId === 'logs-events-member-message') {
      // Handle member & message events dropdown
      const selectedEvents = interaction.values;
      if (!currentConfig.channelId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to set a logging channel first using the **Set Channel** button.')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        return;
      }

      const memberEvents = ['member_join', 'member_leave', 'member_ban', 'member_unban', 'member_kick', 'member_timeout', 'member_untimeout'];
      const messageEvents = ['message_delete', 'message_edit'];
      const categoryEvents = [...memberEvents, ...messageEvents];

      // Get current events and update based on category
      const currentEvents = currentConfig.logEvents || [];
      const eventsToKeep = currentEvents.filter(e => !categoryEvents.includes(e));
      const newEvents = [...eventsToKeep, ...selectedEvents];
      
      currentConfig.logEvents = newEvents;
      dbHelpers.setLoggingConfig(guildId, currentConfig.channelId, currentConfig.enabled, newEvents);
    } else if (interaction.customId === 'logs-events-role-channel') {
      // Handle role & channel events dropdown
      const selectedEvents = interaction.values;
      if (!currentConfig.channelId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to set a logging channel first using the **Set Channel** button.')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        return;
      }

      const roleEvents = ['role_create', 'role_delete', 'role_update'];
      const channelEvents = ['channel_create', 'channel_delete', 'channel_update'];
      const categoryEvents = [...roleEvents, ...channelEvents];

      // Get current events and update based on category
      const currentEvents = currentConfig.logEvents || [];
      const eventsToKeep = currentEvents.filter(e => !categoryEvents.includes(e));
      const newEvents = [...eventsToKeep, ...selectedEvents];
      
      currentConfig.logEvents = newEvents;
      dbHelpers.setLoggingConfig(guildId, currentConfig.channelId, currentConfig.enabled, newEvents);
    }

    // Get fresh config and update embed
    const updatedConfig = dbHelpers.getLoggingConfig(guildId);
    const embed = buildMainMenuEmbed(guildId);
    const components = buildMainMenuComponents(updatedConfig);

    try {
      await interaction.update({ embeds: [embed], components: components });
    } catch (err) {
      await interaction.message.edit({ embeds: [embed], components: components });
    }
    return;
  }

  // Handle buttons
  if (interaction.isButton()) {
    if (interaction.customId === 'logs-view') {
      const currentConfig = dbHelpers.getLoggingConfig(guildId);
      if (!currentConfig || !currentConfig.channelId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No logging channel has been set.')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        return;
      }

      const status = currentConfig.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const channel = interaction.guild.channels.cache.get(currentConfig.channelId);
      const channelField = channel ? `${channel}` : 'Channel not found';
      const eventsCount = currentConfig.logEvents && currentConfig.logEvents.length > 0
        ? currentConfig.logEvents.length
        : 0;

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Logging Settings')
        .setDescription([
          `<:leese:1457834970486800567> **Status:** ${status}`,
          `<:leese:1457834970486800567> **Channel:** ${channelField}`,
          `<:tree:1457808523986731008> **Enabled Events:** \`${eventsCount}\``
        ].join('\n'));

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [viewEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [viewEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (err) {
        await interaction.message.channel.send({ embeds: [viewEmbed] });
      }
    } else if (interaction.customId === 'logs-channel') {
      const { dbHelpers } = require('../../db');
      const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;

      const channelEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Channel Setup**',
          '',
          '<:settings:1457808572720087266> **Usage:**',
          `\`${serverPrefix}logs channel <#channel>\``,
          '',
          '-# <:arrows:1457808531678957784> Use the command above to set the logging channel.',
          '',
          `**Example:** \`${serverPrefix}logs channel #logs\``
        ].join('\n'));

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [channelEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [channelEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (err) {
        await interaction.message.channel.send({ embeds: [channelEmbed] });
      }
    } else if (interaction.customId === 'logs-events-list') {
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

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [eventsEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [eventsEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (err) {
        await interaction.message.channel.send({ embeds: [eventsEmbed] });
      }
    } else if (interaction.customId === 'logs-reset') {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#800000')
        .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Reset Logging Configuration?')
        .setDescription([
          'This will reset **__ALL logging configuration.__**',
          '',
          '<:leese:1457834970486800567> All **settings** will be **restored to defaults**',
          '<:leese:1457834970486800567> All **enabled events** will be **removed**',
          '<:tree:1457808523986731008> The **logging channel** will be **removed**',
          '',
          '**Are you sure you want to proceed?**',
          '',
          '-# <:arrows:1457808531678957784> This action is **permanent** and **cannot be reversed.**'
        ].join('\n'));

      const yesButton = new ButtonBuilder()
        .setCustomId('logs-reset-confirm-yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Danger);
      
      const noButton = new ButtonBuilder()
        .setCustomId('logs-reset-confirm-no')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary);

      const confirmRow = new ActionRowBuilder().addComponents(yesButton, noButton);

      try {
        await interaction.update({ embeds: [confirmEmbed], components: [confirmRow] });
      } catch (err) {
        await interaction.message.edit({ embeds: [confirmEmbed], components: [confirmRow] });
      }

      messageStates.set(messageId, { view: 'reset:confirm', guildId, userId: interaction.user.id });
    } else if (interaction.customId === 'logs-reset-confirm-yes') {
      // Reset configuration
      db.prepare('DELETE FROM logging_config WHERE guild_id = ?').run(guildId);

      const embed = buildMainMenuEmbed(guildId);
      const components = buildMainMenuComponents({
        enabled: false,
        channelId: null,
        logEvents: []
      });

      try {
        await interaction.update({ embeds: [embed], components: components });
      } catch (err) {
        await interaction.message.edit({ embeds: [embed], components: components });
      }

      messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    } else if (interaction.customId === 'logs-reset-confirm-no') {
      const currentConfig = dbHelpers.getLoggingConfig(guildId) || {
        enabled: false,
        channelId: null,
        logEvents: []
      };
      const embed = buildMainMenuEmbed(guildId);
      const components = buildMainMenuComponents(currentConfig);

      try {
        await interaction.update({ embeds: [embed], components: components });
      } catch (err) {
        await interaction.message.edit({ embeds: [embed], components: components });
      }

      messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    }
  }
}

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

    // Handle channel subcommand (still uses text command for channel mention)
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
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Logging channel has been set to ${channel} and **enabled**.\n-# <:tree:1457808523986731008> Use the dropdown menu to enable specific events.`);

      return message.reply({
        embeds: [successEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Show interactive menu if no subcommand or invalid subcommand
    if (!subcommand || (subcommand !== 'channel' && subcommand !== 'view' && subcommand !== 'events' && subcommand !== 'toggle' && subcommand !== 'on' && subcommand !== 'off' && subcommand !== 'remove')) {
      const config = dbHelpers.getLoggingConfig(guildId) || {
        enabled: false,
        channelId: null,
        logEvents: []
      };

      const embed = buildMainMenuEmbed(guildId);
      const components = buildMainMenuComponents(config);

      const reply = await message.reply({
        embeds: [embed],
        components: components,
        allowedMentions: { repliedUser: false }
      });

      // Initialize state
      const messageId = reply.id;
      messageStates.set(messageId, { view: 'main', guildId: message.guild.id, userId: message.author.id });

      // Stop any existing collectors on this message
      if (activeCollectors.has(messageId)) {
        activeCollectors.get(messageId).stop();
        activeCollectors.delete(messageId);
      }

      // Create a persistent collector
      const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 300000 // 5 minutes
      });

      activeCollectors.set(messageId, collector);

      collector.on('collect', async (interaction) => {
        try {
          await handleInteraction(interaction, config, message.guild.id);
        } catch (err) {
          // Silently handle errors
        }
      });

      collector.on('end', () => {
        activeCollectors.delete(messageId);
        messageStates.delete(messageId);
      });

      return;
    }

    // Legacy subcommands (view, events, toggle, on, off, remove) - kept for compatibility
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
      const eventsCount = config.logEvents && config.logEvents.length > 0
        ? config.logEvents.length
        : 0;

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Logging Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Channel', value: channelField, inline: true },
          { name: 'Enabled Events', value: `\`${eventsCount}\``, inline: false }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

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

    // Toggle on/off for entire system
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
          .setAuthor({ name: 'Member Joined', iconURL: member.user.displayAvatarURL() })
          .setDescription(`**Member:** ${member.user} (\`${member.user.id}\`)\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:d>)`)
          .setFooter({ text: `Member #${member.guild.memberCount}` })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Member leave
    client.on(Events.GuildMemberRemove, async (member) => {
      const config = dbHelpers.getLoggingConfig(member.guild.id);
      if (!config || !config.enabled || !config.channelId) return;

      // Check if we need to log member_leave or member_kick
      const shouldLogLeave = config.logEvents.includes('member_leave');
      const shouldLogKick = config.logEvents.includes('member_kick');

      if (!shouldLogLeave && !shouldLogKick) return;

      try {
        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        // Check audit logs to see if it was a kick
        let wasKicked = false;
        let kickedBy = null;
        
        if (shouldLogKick) {
          try {
            const auditLogs = await member.guild.fetchAuditLogs({
              limit: 1,
              type: 20 // MEMBER_KICK
            }).catch(() => null);

            if (auditLogs && auditLogs.entries.size > 0) {
              const kickEntry = auditLogs.entries.first();
              if (kickEntry.targetId === member.id && kickEntry.createdTimestamp > Date.now() - 5000) {
                wasKicked = true;
                kickedBy = kickEntry.executor;
              }
            }
          } catch (error) {}
        }

        if (wasKicked && shouldLogKick) {
          // Log as kick
          const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Member Kicked', iconURL: member.user.displayAvatarURL() })
            .setDescription(`**Member:** ${member.user} (\`${member.user.id}\`)\n**Kicked by:** ${kickedBy ? `${kickedBy} (\`${kickedBy.id}\`)` : '`Unknown`'}`)
            .setTimestamp();

          await channel.send({ embeds: [embed] }).catch(() => {});
        } else if (shouldLogLeave && !wasKicked) {
          // Log as leave
          const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Member Left', iconURL: member.user.displayAvatarURL() })
            .setDescription(`**Member:** ${member.user} (\`${member.user.id}\`)`)
            .setTimestamp();

          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      } catch (error) {}
    });

    // Member ban
    client.on(Events.GuildBanAdd, async (ban) => {
      const config = dbHelpers.getLoggingConfig(ban.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('member_ban')) return;

      try {
        const channel = ban.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        // Try to get who banned them
        let bannedBy = null;
        try {
          const auditLogs = await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 22 // MEMBER_BAN_ADD
          }).catch(() => null);

          if (auditLogs && auditLogs.entries.size > 0) {
            const banEntry = auditLogs.entries.first();
            if (banEntry.targetId === ban.user.id && banEntry.createdTimestamp > Date.now() - 5000) {
              bannedBy = banEntry.executor;
            }
          }
        } catch (error) {}

        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: 'Member Banned', iconURL: ban.user.displayAvatarURL() })
          .setDescription(`**Member:** ${ban.user} (\`${ban.user.id}\`)\n**Banned by:** ${bannedBy ? `${bannedBy} (\`${bannedBy.id}\`)` : '`Unknown`'}`)
          .addFields({ name: 'Reason', value: ban.reason ? `\`${ban.reason}\`` : '`No reason provided`', inline: false })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Member unban
    client.on(Events.GuildBanRemove, async (ban) => {
      const config = dbHelpers.getLoggingConfig(ban.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('member_unban')) return;

      try {
        const channel = ban.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        // Try to get who unbanned them
        let unbannedBy = null;
        try {
          const auditLogs = await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 23 // MEMBER_BAN_REMOVE
          }).catch(() => null);

          if (auditLogs && auditLogs.entries.size > 0) {
            const unbanEntry = auditLogs.entries.first();
            if (unbanEntry.targetId === ban.user.id && unbanEntry.createdTimestamp > Date.now() - 5000) {
              unbannedBy = unbanEntry.executor;
            }
          }
        } catch (error) {}

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: 'Member Unbanned', iconURL: ban.user.displayAvatarURL() })
          .setDescription(`**Member:** ${ban.user} (\`${ban.user.id}\`)\n**Unbanned by:** ${unbannedBy ? `${unbannedBy} (\`${unbannedBy.id}\`)` : '`Unknown`'}`)
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Member timeout/untimeout
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
      const config = dbHelpers.getLoggingConfig(newMember.guild.id);
      if (!config || !config.enabled || !config.channelId) return;

      const shouldLogTimeout = config.logEvents.includes('member_timeout');
      const shouldLogUntimeout = config.logEvents.includes('member_untimeout');

      if (!shouldLogTimeout && !shouldLogUntimeout) return;

      const oldTimeout = oldMember.communicationDisabledUntil;
      const newTimeout = newMember.communicationDisabledUntil;

      // Check if timeout was added
      if (shouldLogTimeout && !oldTimeout && newTimeout && newTimeout > Date.now()) {
        try {
          const channel = newMember.guild.channels.cache.get(config.channelId);
          if (!channel) return;

          // Try to get who timed them out
          let timedOutBy = null;
          try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
              limit: 1,
              type: 24 // MEMBER_UPDATE
            }).catch(() => null);

            if (auditLogs && auditLogs.entries.size > 0) {
              const timeoutEntry = auditLogs.entries.first();
              if (timeoutEntry.targetId === newMember.id && timeoutEntry.createdTimestamp > Date.now() - 5000) {
                timedOutBy = timeoutEntry.executor;
              }
            }
          } catch (error) {}

          const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setAuthor({ name: 'Member Timed Out', iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`**Member:** ${newMember.user} (\`${newMember.user.id}\`)\n**Timed out by:** ${timedOutBy ? `${timedOutBy} (\`${timedOutBy.id}\`)` : '`Unknown`'}\n**Until:** <t:${Math.floor(newTimeout.getTime() / 1000)}:F> (<t:${Math.floor(newTimeout.getTime() / 1000)}:R>)`)
            .setTimestamp();

          await channel.send({ embeds: [embed] }).catch(() => {});
        } catch (error) {}
      }

      // Check if timeout was removed
      if (shouldLogUntimeout && oldTimeout && oldTimeout > Date.now() && (!newTimeout || newTimeout <= Date.now())) {
        try {
          const channel = newMember.guild.channels.cache.get(config.channelId);
          if (!channel) return;

          // Try to get who removed the timeout
          let untimedOutBy = null;
          try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
              limit: 1,
              type: 24 // MEMBER_UPDATE
            }).catch(() => null);

            if (auditLogs && auditLogs.entries.size > 0) {
              const untimeoutEntry = auditLogs.entries.first();
              if (untimeoutEntry.targetId === newMember.id && untimeoutEntry.createdTimestamp > Date.now() - 5000) {
                untimedOutBy = untimeoutEntry.executor;
              }
            }
          } catch (error) {}

          const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Member Timeout Removed', iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`**Member:** ${newMember.user} (\`${newMember.user.id}\`)\n**Untimed out by:** ${untimedOutBy ? `${untimedOutBy} (\`${untimedOutBy.id}\`)` : '`Unknown`'}`)
            .setTimestamp();

          await channel.send({ embeds: [embed] }).catch(() => {});
        } catch (error) {}
      }
    });

    // Role create
    client.on(Events.GuildRoleCreate, async (role) => {
      const config = dbHelpers.getLoggingConfig(role.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('role_create')) return;

      try {
        const channel = role.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        // Try to get who created it
        let createdBy = null;
        try {
          const auditLogs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: 30 // ROLE_CREATE
          }).catch(() => null);

          if (auditLogs && auditLogs.entries.size > 0) {
            const createEntry = auditLogs.entries.first();
            if (createEntry.targetId === role.id && createEntry.createdTimestamp > Date.now() - 5000) {
              createdBy = createEntry.executor;
            }
          }
        } catch (error) {}

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: 'Role Created' })
          .setDescription(`**Role:** <@&${role.id}> (\`${role.id}\`)\n**Created by:** ${createdBy ? `${createdBy} (\`${createdBy.id}\`)` : '`Unknown`'}`)
          .addFields(
            { name: 'Color', value: `${role.hexColor}`, inline: true },
            { name: 'Mentionable', value: role.mentionable ? '`Yes`' : '`No`', inline: true },
            { name: 'Hoisted', value: role.hoist ? '`Yes`' : '`No`', inline: true }
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Role delete
    client.on(Events.GuildRoleDelete, async (role) => {
      const config = dbHelpers.getLoggingConfig(role.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('role_delete')) return;

      try {
        const channel = role.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        // Try to get who deleted it
        let deletedBy = null;
        try {
          const auditLogs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: 32 // ROLE_DELETE
          }).catch(() => null);

          if (auditLogs && auditLogs.entries.size > 0) {
            const deleteEntry = auditLogs.entries.first();
            if (deleteEntry.targetId === role.id && deleteEntry.createdTimestamp > Date.now() - 5000) {
              deletedBy = deleteEntry.executor;
            }
          }
        } catch (error) {}

        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: 'Role Deleted' })
          .setDescription(`**Role:** \`${role.name}\` (\`${role.id}\`)\n**Deleted by:** ${deletedBy ? `${deletedBy} (\`${deletedBy.id}\`)` : '`Unknown`'}`)
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Role update
    client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
      const config = dbHelpers.getLoggingConfig(newRole.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('role_update')) return;

      // Check if anything actually changed
      if (oldRole.name === newRole.name && 
          oldRole.color === newRole.color && 
          oldRole.permissions === newRole.permissions &&
          oldRole.mentionable === newRole.mentionable &&
          oldRole.hoist === newRole.hoist) {
        return;
      }

      try {
        const channel = newRole.guild.channels.cache.get(config.channelId);
        if (!channel) return;

        const changes = [];
        if (oldRole.name !== newRole.name) {
          changes.push(`**Name:** \`${oldRole.name}\` → \`${newRole.name}\``);
        }
        if (oldRole.color !== newRole.color) {
          changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
        }
        if (oldRole.permissions !== newRole.permissions) {
          changes.push(`**Permissions:** Changed`);
        }
        if (oldRole.mentionable !== newRole.mentionable) {
          changes.push(`**Mentionable:** ${oldRole.mentionable} → ${newRole.mentionable}`);
        }
        if (oldRole.hoist !== newRole.hoist) {
          changes.push(`**Hoisted:** ${oldRole.hoist} → ${newRole.hoist}`);
        }

        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'Role Updated' })
          .setDescription(`**Role:** <@&${newRole.id}> (\`${newRole.id}\`)`)
          .addFields({ name: 'Changes', value: changes.length > 0 ? changes.join('\n') : '`Unknown changes`', inline: false })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Channel create
    client.on(Events.ChannelCreate, async (channel) => {
      if (!channel.guild) return;
      const config = dbHelpers.getLoggingConfig(channel.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('channel_create')) return;

      try {
        const logChannel = channel.guild.channels.cache.get(config.channelId);
        if (!logChannel) return;

        // Try to get who created it
        let createdBy = null;
        try {
          const auditLogs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: 10 // CHANNEL_CREATE
          }).catch(() => null);

          if (auditLogs && auditLogs.entries.size > 0) {
            const createEntry = auditLogs.entries.first();
            if (createEntry.targetId === channel.id && createEntry.createdTimestamp > Date.now() - 5000) {
              createdBy = createEntry.executor;
            }
          }
        } catch (error) {}

        const channelType = channel.type === ChannelType.GuildText ? 'Text' : 
                            channel.type === ChannelType.GuildVoice ? 'Voice' : 
                            channel.type === ChannelType.GuildCategory ? 'Category' : 
                            channel.type === ChannelType.GuildForum ? 'Forum' :
                            channel.type === ChannelType.GuildAnnouncement ? 'Announcement' : 'Other';
        
        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: 'Channel Created' })
          .setDescription(`**Channel:** ${channel} (\`${channel.id}\`)\n**Type:** \`${channelType}\`\n**Created by:** ${createdBy ? `${createdBy} (\`${createdBy.id}\`)` : '`Unknown`'}`)
          .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Channel delete
    client.on(Events.ChannelDelete, async (channel) => {
      if (!channel.guild) return;
      const config = dbHelpers.getLoggingConfig(channel.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('channel_delete')) return;

      try {
        const logChannel = channel.guild.channels.cache.get(config.channelId);
        if (!logChannel) return;

        // Try to get who deleted it
        let deletedBy = null;
        try {
          const auditLogs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: 12 // CHANNEL_DELETE
          }).catch(() => null);

          if (auditLogs && auditLogs.entries.size > 0) {
            const deleteEntry = auditLogs.entries.first();
            if (deleteEntry.targetId === channel.id && deleteEntry.createdTimestamp > Date.now() - 5000) {
              deletedBy = deleteEntry.executor;
            }
          }
        } catch (error) {}

        const channelType = channel.type === ChannelType.GuildText ? 'Text' : 
                            channel.type === ChannelType.GuildVoice ? 'Voice' : 
                            channel.type === ChannelType.GuildCategory ? 'Category' : 
                            channel.type === ChannelType.GuildForum ? 'Forum' :
                            channel.type === ChannelType.GuildAnnouncement ? 'Announcement' : 'Other';
        
        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: 'Channel Deleted' })
          .setDescription(`**Channel:** \`${channel.name}\` (\`${channel.id}\`)\n**Type:** \`${channelType}\`\n**Deleted by:** ${deletedBy ? `${deletedBy} (\`${deletedBy.id}\`)` : '`Unknown`'}`)
          .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });

    // Channel update
    client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
      if (!newChannel.guild) return;
      const config = dbHelpers.getLoggingConfig(newChannel.guild.id);
      if (!config || !config.enabled || !config.channelId || !config.logEvents.includes('channel_update')) return;

      // Check if anything actually changed
      if (oldChannel.name === newChannel.name && 
          oldChannel.topic === newChannel.topic &&
          oldChannel.nsfw === newChannel.nsfw &&
          oldChannel.rateLimitPerUser === newChannel.rateLimitPerUser) {
        return;
      }

      try {
        const logChannel = newChannel.guild.channels.cache.get(config.channelId);
        if (!logChannel) return;

        const changes = [];
        if (oldChannel.name !== newChannel.name) {
          changes.push(`**Name:** \`${oldChannel.name}\` → \`${newChannel.name}\``);
        }
        if (oldChannel.topic !== newChannel.topic) {
          changes.push(`**Topic:** ${oldChannel.topic || 'None'} → ${newChannel.topic || 'None'}`);
        }
        if (oldChannel.nsfw !== newChannel.nsfw) {
          changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
        }
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
          changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
        }

        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'Channel Updated' })
          .setDescription(`**Channel:** ${newChannel} (\`${newChannel.id}\`)`)
          .addFields({ name: 'Changes', value: changes.length > 0 ? changes.join('\n') : '`Unknown changes`', inline: false })
          .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
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

        const content = message.content ? (message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content) : '*No content*';
        
        const embed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: 'Message Deleted', iconURL: message.author.displayAvatarURL() })
          .setDescription(`**Author:** ${message.author} (\`${message.author.id}\`)\n**Channel:** ${message.channel}`)
          .setFooter({ text: `Message ID: ${message.id}` })
          .setTimestamp();

        // Add content field if there's text
        if (message.content) {
          embed.addFields({ name: 'Content', value: content, inline: false });
        }

        // Handle attachments (images, videos, files)
        if (message.attachments && message.attachments.size > 0) {
          const attachments = Array.from(message.attachments.values());
          const imageAttachments = attachments.filter(att => 
            att.contentType && att.contentType.startsWith('image/')
          );
          const videoAttachments = attachments.filter(att => 
            att.contentType && att.contentType.startsWith('video/')
          );
          const otherAttachments = attachments.filter(att => 
            (!att.contentType || (!att.contentType.startsWith('image/') && !att.contentType.startsWith('video/')))
          );

          // Set first image as embed image if available
          if (imageAttachments.length > 0) {
            embed.setImage(imageAttachments[0].url);
          }

          // Add attachment information fields
          const attachmentInfo = [];
          
          if (imageAttachments.length > 0) {
            const imageList = imageAttachments.map((att, idx) => 
              `[${idx + 1}] [${att.name || 'image'}](${att.url})`
            ).join('\n');
            attachmentInfo.push(`**Images (${imageAttachments.length}):**\n${imageList}`);
          }

          if (videoAttachments.length > 0) {
            const videoList = videoAttachments.map((att, idx) => 
              `[${idx + 1}] [${att.name || 'video'}](${att.url})`
            ).join('\n');
            attachmentInfo.push(`**Videos (${videoAttachments.length}):**\n${videoList}`);
          }

          if (otherAttachments.length > 0) {
            const otherList = otherAttachments.map((att, idx) => 
              `[${idx + 1}] [${att.name || 'file'}](${att.url}) \`${att.size ? formatBytes(att.size) : 'Unknown size'}\``
            ).join('\n');
            attachmentInfo.push(`**Files (${otherAttachments.length}):**\n${otherList}`);
          }

          if (attachmentInfo.length > 0) {
            embed.addFields({ 
              name: 'Attachments', 
              value: attachmentInfo.join('\n\n'), 
              inline: false 
            });
          }
        }

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

        const beforeContent = oldMessage.content ? (oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content) : '*No content*';
        const afterContent = newMessage.content ? (newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content) : '*No content*';
        
        const embed = new EmbedBuilder()
          .setColor('#FEE75C')
          .setAuthor({ name: 'Message Edited', iconURL: newMessage.author.displayAvatarURL() })
          .setDescription(`**Author:** ${newMessage.author} (\`${newMessage.author.id}\`)\n**Channel:** ${newMessage.channel}`)
          .addFields(
            { name: 'Before', value: beforeContent, inline: false },
            { name: 'After', value: afterContent, inline: false }
          )
          .setFooter({ text: `Message ID: ${newMessage.id}` })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      } catch (error) {}
    });
  }
};
