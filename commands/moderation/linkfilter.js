const { EmbedBuilder, PermissionsBitField, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { dbHelpers, db } = require('../../db');

const DEFAULT_PREFIX = ',';

// Store active collectors and message states
const activeCollectors = new Map();
const messageStates = new Map(); // messageId -> { view: 'main' | 'config', guildId, userId }

// Helper: Build main menu embed
function buildMainMenuEmbed(guildId) {
  const { dbHelpers } = require('../../db');
  const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;
  const config = dbHelpers.getLinkFilter(guildId) || {
    enabled: false,
    actions: ['delete'],
    whitelist: [],
    allowedDomains: []
  };

  const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
  const actions = config.actions && config.actions.length > 0
    ? config.actions.map(a => `\`${a}\``).join(', ')
    : 'None';
  const allowedDomains = config.allowedDomains && config.allowedDomains.length > 0
    ? config.allowedDomains.slice(0, 5).map(d => `\`${d}\``).join(', ') + (config.allowedDomains.length > 5 ? ` +${config.allowedDomains.length - 5} more` : '')
    : 'None';
  const whitelistCount = config.whitelist ? config.whitelist.length : 0;

  return new EmbedBuilder()
    .setColor('#838996')
    .setTitle('<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Link Filter')
    .setDescription([
      '<:clicks:1457865474321944659> **Interactive Setup**',
      '',
      'Configure link filtering settings using the dropdowns below.',
      '',
      '<:settings:1457808572720087266> **Current Settings:**',
      `<:leese:1457834970486800567> **Status:** ${status}`,
      `<:leese:1457834970486800567> **Actions:** ${actions}`,
      `<:leese:1457834970486800567> **Allowed Domains:** ${allowedDomains}`,
      `<:tree:1457808523986731008> **Whitelisted Users:** \`${whitelistCount}\``,
      '',
      '-# <:arrows:1457808531678957784> All changes are saved **automatically**!'
    ].join('\n'));
}

// Helper: Build main menu components
function buildMainMenuComponents(config) {
  if (!config.actions || !Array.isArray(config.actions)) {
    config.actions = config.action ? [config.action] : ['delete'];
  }

  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId('linkfilter-status')
    .setPlaceholder(`Status: ${config.enabled ? 'Enabled' : 'Disabled'}`)
    .addOptions([
      { label: 'Enable', value: 'on', description: 'Enable link filter' },
      { label: 'Disable', value: 'off', description: 'Disable link filter' }
    ]);

  // Action toggles - use multi-select for actions
  const actionSelect = new StringSelectMenuBuilder()
    .setCustomId('linkfilter-action')
    .setPlaceholder('Toggle Actions (can select multiple)')
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions([
      { label: 'Delete', value: 'delete', description: 'Delete messages with links', default: config.actions.includes('delete') },
      { label: 'Warn', value: 'warn', description: 'Warn users who post links', default: config.actions.includes('warn') },
      { label: 'Timeout', value: 'timeout', description: 'Timeout users who post links', default: config.actions.includes('timeout') }
    ]);

  const statusRow = new ActionRowBuilder().addComponents(statusSelect);
  const actionRow = new ActionRowBuilder().addComponents(actionSelect);

  const manageButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('linkfilter-whitelist')
        .setLabel('Whitelist User')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('linkfilter-domains')
        .setLabel('Manage Domains')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('linkfilter-view')
        .setLabel('View Config')
        .setStyle(ButtonStyle.Secondary)
    );

  // Only add Reset button if there's configuration
  if (config && (config.enabled || (config.actions && config.actions.length > 0 && !(config.actions.length === 1 && config.actions[0] === 'delete')) || (config.allowedDomains && config.allowedDomains.length > 0) || (config.whitelist && config.whitelist.length > 0))) {
    manageButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('linkfilter-reset')
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger)
    );
  }

  return [statusRow, actionRow, manageButtons];
}

// Unified interaction handler
async function handleInteraction(interaction, config, guildId) {
  if (interaction.replied || interaction.deferred) return;

  const messageId = interaction.message.id;
  const state = messageStates.get(messageId) || { view: 'main', guildId, userId: interaction.user.id };

  // Handle dropdown selections
  if (interaction.isStringSelectMenu()) {
    const currentConfig = dbHelpers.getLinkFilter(guildId) || {
      enabled: false,
      actions: ['delete'],
      whitelist: [],
      allowedDomains: []
    };

    if (!currentConfig.actions || !Array.isArray(currentConfig.actions)) {
      currentConfig.actions = currentConfig.action ? [currentConfig.action] : ['delete'];
    }

    if (interaction.customId === 'linkfilter-status') {
      const value = interaction.values[0];
      currentConfig.enabled = value === 'on';
      dbHelpers.setLinkFilter(guildId, currentConfig);
    } else if (interaction.customId === 'linkfilter-action') {
      const selectedActions = interaction.values;
      // Ensure at least one action is selected
      if (selectedActions.length === 0) {
        selectedActions.push('delete'); // Default to delete if none selected
      }
      currentConfig.actions = selectedActions;
      dbHelpers.setLinkFilter(guildId, currentConfig);
    }

    // Get fresh config and update embed
    const updatedConfig = dbHelpers.getLinkFilter(guildId);
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
    if (interaction.customId === 'linkfilter-view') {
      const currentConfig = dbHelpers.getLinkFilter(guildId);
      if (!currentConfig) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No link filter configuration set.')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        return;
      }

      const status = currentConfig.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const actions = currentConfig.actions && currentConfig.actions.length > 0
        ? currentConfig.actions.map(a => `\`${a}\``).join(', ')
        : 'None';
      const allowedDomains = currentConfig.allowedDomains && currentConfig.allowedDomains.length > 0
        ? currentConfig.allowedDomains.map(d => `\`${d}\``).join(', ')
        : 'None';
      const whitelistCount = currentConfig.whitelist ? currentConfig.whitelist.length : 0;
      const whitelistList = currentConfig.whitelist && currentConfig.whitelist.length > 0
        ? currentConfig.whitelist.map(id => `<:leese:1457834970486800567> <@${id}>`).join('\n')
        : '<:leese:1457834970486800567> `None`';

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Link Filter Settings')
        .setDescription([
          `<:leese:1457834970486800567> **Status:** ${status}`,
          `<:leese:1457834970486800567> **Actions:** ${actions}`,
          `<:tree:1457808523986731008> **Allowed Domains:** ${allowedDomains}`,
          '',
          '<:user:1457896166233473227> **Whitelisted Users:**',
          whitelistList
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
    } else if (interaction.customId === 'linkfilter-whitelist') {
      const { dbHelpers } = require('../../db');
      const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;

      const whitelistEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Whitelist Management**',
          '',
          '<:settings:1457808572720087266> **Usage:**',
          `\`${serverPrefix}linkfilter whitelist <user>\``,
          `\`${serverPrefix}linkfilter whitelist remove <user>\``,
          '',
          '-# <:arrows:1457808531678957784> Use the commands above to manage the **whitelist.**'
        ].join('\n'));

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [whitelistEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [whitelistEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (err) {
        await interaction.message.channel.send({ embeds: [whitelistEmbed] });
      }
    } else if (interaction.customId === 'linkfilter-domains') {
      const { dbHelpers } = require('../../db');
      const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;

      const domainsEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Domain Management**',
          '',
          '<:settings:1457808572720087266> **Usage:**',
          `\`${serverPrefix}linkfilter allow <domain>\``,
          `\`${serverPrefix}linkfilter remove <domain>\``,
          '',
          '-# <:arrows:1457808531678957784> Use the commands above to manage **allowed domains.**',
          '',
          `**Example:** \`${serverPrefix}linkfilter allow discord.gg\``,
          `**Example:** \`${serverPrefix}linkfilter allow youtube.com\``
        ].join('\n'));

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [domainsEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [domainsEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (err) {
        await interaction.message.channel.send({ embeds: [domainsEmbed] });
      }
    } else if (interaction.customId === 'linkfilter-reset') {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#800000')
        .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Reset Link Filter Configuration?')
        .setDescription([
          'This will reset **__ALL link filter configuration.__**',
          '',
          '<:leese:1457834970486800567> All **settings** will be **restored to defaults**',
          '<:leese:1457834970486800567> All **allowed domains** will be **removed**',
          '<:tree:1457808523986731008> All **whitelisted users** will be **removed**',
          '',
          '**Are you sure you want to proceed?**',
          '',
          '-# <:arrows:1457808531678957784> This action is **permanent** and **cannot be reversed.**'
        ].join('\n'));

      const yesButton = new ButtonBuilder()
        .setCustomId('linkfilter-reset-confirm-yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Danger);
      
      const noButton = new ButtonBuilder()
        .setCustomId('linkfilter-reset-confirm-no')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary);

      const confirmRow = new ActionRowBuilder().addComponents(yesButton, noButton);

      try {
        await interaction.update({ embeds: [confirmEmbed], components: [confirmRow] });
      } catch (err) {
        await interaction.message.edit({ embeds: [confirmEmbed], components: [confirmRow] });
      }

      messageStates.set(messageId, { view: 'reset:confirm', guildId, userId: interaction.user.id });
    } else if (interaction.customId === 'linkfilter-reset-confirm-yes') {
      // Reset configuration
      db.prepare('DELETE FROM link_filter WHERE guild_id = ?').run(guildId);

      const embed = buildMainMenuEmbed(guildId);
      const components = buildMainMenuComponents({
        enabled: false,
        actions: ['delete'],
        whitelist: [],
        allowedDomains: []
      });

      try {
        await interaction.update({ embeds: [embed], components: components });
      } catch (err) {
        await interaction.message.edit({ embeds: [embed], components: components });
      }

      messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    } else if (interaction.customId === 'linkfilter-reset-confirm-no') {
      const currentConfig = dbHelpers.getLinkFilter(guildId) || {
        enabled: false,
        actions: ['delete'],
        whitelist: [],
        allowedDomains: []
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
  name: 'linkfilter',
  aliases: ['lf', 'filterlinks'],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Configure link filtering settings.',
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

    // Handle text-based subcommands (whitelist, allow, remove domain)
    if (subcommand === 'whitelist' || subcommand === 'allow' || (subcommand === 'remove' && args[1] && !args[1].match(/^\d+$/))) {
      // These still use text commands for user/domain input
      // Whitelist management
      if (subcommand === 'whitelist') {
        const userInput = args[1];
        const remove = args[1]?.toLowerCase() === 'remove';
        const targetInput = remove ? args[2] : args[1];

        if (!targetInput) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  '<:settings:1457808572720087266> **Usage:**',
                  `\`\`\`${prefix}linkfilter whitelist <user>\`\`\``,
                  `\`\`\`${prefix}linkfilter whitelist remove <user>\`\`\``,
                  '-# <:arrows:1457808531678957784> Add or remove a user from the link filter whitelist.',
                  '',
                  `**Example:** \`${prefix}linkfilter whitelist @user\``,
                  `**Example:** \`${prefix}linkfilter whitelist remove @user\``
                ].join('\n'))
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        // Get user
        let targetUser = null;
        if (targetInput.match(/^\d{17,19}$/)) {
          try {
            targetUser = await message.client.users.fetch(targetInput);
          } catch (e) {
            targetUser = null;
          }
        } else {
          const mention = message.mentions.users.first();
          if (mention) targetUser = mention;
        }

        if (!targetUser) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found.')
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        let config = dbHelpers.getLinkFilter(guildId) || {
          enabled: false,
          actions: ['delete'],
          whitelist: [],
          allowedDomains: []
        };

        if (remove) {
          if (!config.whitelist.includes(targetUser.id)) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${targetUser.id}> is not whitelisted.`)
              ],
              allowedMentions: { repliedUser: false }
            });
          }
          config.whitelist = config.whitelist.filter(id => id !== targetUser.id);
          dbHelpers.setLinkFilter(guildId, config);
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> <@${targetUser.id}> has been **removed** from the whitelist.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        } else {
          if (config.whitelist.includes(targetUser.id)) {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${targetUser.id}> is already whitelisted.`)
              ],
              allowedMentions: { repliedUser: false }
            });
          }
          config.whitelist.push(targetUser.id);
          dbHelpers.setLinkFilter(guildId, config);
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> <@${targetUser.id}> has been **added** to the whitelist.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }
      }

      // Allow domain
      if (subcommand === 'allow') {
        const domain = args[1];
        
        if (!domain) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  '<:settings:1457808572720087266> **Usage:**',
                  `\`\`\`${prefix}linkfilter allow <domain>\`\`\``,
                  '-# <:arrows:1457808531678957784> Add a domain to the allowed list.',
                  '',
                  `**Example:** \`${prefix}linkfilter allow discord.gg\``,
                  `**Example:** \`${prefix}linkfilter allow youtube.com\``
                ].join('\n'))
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        // Clean domain (remove http://, https://, www.)
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();

        let config = dbHelpers.getLinkFilter(guildId) || {
          enabled: false,
          actions: ['delete'],
          whitelist: [],
          allowedDomains: []
        };

        if (config.allowedDomains.includes(cleanDomain)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Domain \`${cleanDomain}\` is already allowed.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        config.allowedDomains.push(cleanDomain);
        dbHelpers.setLinkFilter(guildId, config);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Domain \`${cleanDomain}\` has been **added** to the allowed list.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Remove domain
      if (subcommand === 'remove' && args[1]) {
        const domain = args[1];
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();

        let config = dbHelpers.getLinkFilter(guildId);
        if (!config || !config.allowedDomains.includes(cleanDomain)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Domain \`${cleanDomain}\` is not in the allowed list.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        config.allowedDomains = config.allowedDomains.filter(d => d !== cleanDomain);
        dbHelpers.setLinkFilter(guildId, config);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Domain \`${cleanDomain}\` has been **removed** from the allowed list.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    // Show interactive menu if no subcommand or invalid subcommand
    if (!subcommand || (subcommand !== 'whitelist' && subcommand !== 'allow' && subcommand !== 'remove' && subcommand !== 'view' && subcommand !== 'action' && subcommand !== 'toggle' && subcommand !== 'on' && subcommand !== 'off')) {
      const config = dbHelpers.getLinkFilter(guildId) || {
        enabled: false,
        actions: ['delete'],
        whitelist: [],
        allowedDomains: []
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

    // Legacy subcommands (view, action, toggle) - kept for compatibility
    if (subcommand === 'view') {
      const config = dbHelpers.getLinkFilter(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No link filter configuration set.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const actions = config.actions && config.actions.length > 0
        ? config.actions.map(a => `\`${a}\``).join(', ')
        : 'None';
      const allowedDomains = config.allowedDomains.length > 0 
        ? config.allowedDomains.map(d => `\`${d}\``).join(', ')
        : 'None';
      const whitelistCount = config.whitelist.length;

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Link Filter Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Actions', value: actions || 'None', inline: true },
          { name: 'Allowed Domains', value: allowedDomains || 'None', inline: false },
          { name: 'Whitelisted Users', value: `${whitelistCount}`, inline: true }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Remove configuration (only if no domain specified)
    if (subcommand === 'remove' && !args[1]) {
      const config = dbHelpers.getLinkFilter(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No link filter configuration to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      db.prepare('DELETE FROM link_filter WHERE guild_id = ?').run(guildId);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Link filter configuration has been **removed**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  },

  setup: (client) => {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    client.on(Events.MessageCreate, async (message) => {
      if (!message.guild || message.author.bot) return;

      const config = dbHelpers.getLinkFilter(message.guild.id);
      if (!config || !config.enabled) return;

      // Check if user is server owner (exclude from filtering)
      if (message.guild.ownerId === message.author.id) return;

      // Check if user is whitelisted
      if (config.whitelist && config.whitelist.includes(message.author.id)) return;

      // Check for URLs in message
      const urls = message.content.match(urlRegex);
      if (!urls || urls.length === 0) return;

      // Check if any URL is in allowed domains
      let hasAllowedDomain = false;
      if (config.allowedDomains && config.allowedDomains.length > 0) {
        for (const url of urls) {
          try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');
            if (config.allowedDomains.some(allowed => domain.includes(allowed) || allowed.includes(domain))) {
              hasAllowedDomain = true;
              break;
            }
          } catch (e) {
            // Invalid URL, continue
          }
        }
      }

      if (hasAllowedDomain) return;

      // Execute all enabled actions
      try {
        const actions = config.actions || (config.action ? [config.action] : ['delete']);
        let messageDeleted = false;
        
        for (const action of actions) {
          if (action === 'delete' && !messageDeleted) {
            await message.delete().catch(() => {});
            messageDeleted = true;
          } else if (action === 'warn') {
            const warnMsg = await message.channel.send({
              content: `<@${message.author.id}> Links are not allowed in this server.`
            }).catch(() => null);
            if (warnMsg) {
              setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
            }
            // Also delete message if not already deleted
            if (!messageDeleted) {
              await message.delete().catch(() => {});
              messageDeleted = true;
            }
          } else if (action === 'timeout') {
            try {
              const member = await message.guild.members.fetch(message.author.id).catch(() => null);
              if (!member) {
                continue;
              }
              
              // Check bot permissions
              if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                continue;
              }
              
              // Check if bot can timeout this member (role hierarchy)
              if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                continue;
              }
              
              // Check if member is timeoutable
              if (!member.moderatable) {
                continue;
              }
              
              // Timeout for 1 minute (60000ms = 60 seconds)
              await member.timeout(60000, 'Link filter violation').catch(() => {});
            } catch (error) {
              // Continue with other actions even if timeout fails
            }
            
            // Also delete message if not already deleted
            if (!messageDeleted) {
              await message.delete().catch(() => {});
              messageDeleted = true;
            }
          }
        }
      } catch (error) {
        console.error('Error in link filter:', error);
      }
    });
  }
};
