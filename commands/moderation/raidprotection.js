const { EmbedBuilder, PermissionsBitField, Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { dbHelpers, db } = require('../../db');

const DEFAULT_PREFIX = ',';

// second linkfilter-sized ui; i aged in dog years here 😭

// Store active collectors and message states
const activeCollectors = new Map();
const messageStates = new Map(); // messageId -> { view: 'main' | 'config', guildId, userId }

// Helper: Build main menu embed
function buildMainMenuEmbed(guildId) {
  const { dbHelpers } = require('../../db');
  const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;
  const config = dbHelpers.getRaidProtection(guildId) || {
    enabled: false,
    memberThreshold: 5,
    timeWindow: 10000,
    action: 'lockdown',
    whitelist: []
  };

  const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
  const whitelistCount = config.whitelist ? config.whitelist.length : 0;

  return new EmbedBuilder()
    .setColor('#838996')
    .setTitle('<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Raid Protection')
    .setDescription([
      '<:clicks:1457865474321944659> **Interactive Setup**',
      '',
      'Configure raid protection settings using the dropdowns below.',
      '',
      '<:settings:1457808572720087266> **Current Settings:**',
      `<:leese:1457834970486800567> **Status:** ${status}`,
      `<:leese:1457834970486800567> **Threshold:** \`${config.memberThreshold} members\``,
      `<:leese:1457834970486800567> **Time Window:** \`${config.timeWindow / 1000}s\``,
      `<:leese:1457834970486800567> **Action:** \`${config.action}\``,
      `<:tree:1457808523986731008> **Whitelisted Users:** \`${whitelistCount}\``,
      '',
      '-# <:arrows:1457808531678957784> All changes are saved **automatically**!'
    ].join('\n'));
}

// Helper: Build main menu components
function buildMainMenuComponents(config) {
  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId('raid-status')
    .setPlaceholder(`Status: ${config.enabled ? 'Enabled' : 'Disabled'}`)
    .addOptions([
      { label: 'Enable', value: 'on', description: 'Enable raid protection' },
      { label: 'Disable', value: 'off', description: 'Disable raid protection' }
    ]);

  const thresholdSelect = new StringSelectMenuBuilder()
    .setCustomId('raid-threshold')
    .setPlaceholder(`Threshold: ${config.memberThreshold} members`)
    .addOptions([
      { label: 'Threshold: 2', value: '2', description: 'Very sensitive - 2 members' },
      { label: 'Threshold: 3', value: '3', description: 'Sensitive - 3 members' },
      { label: 'Threshold: 5', value: '5', description: 'Moderate - 5 members (default)' },
      { label: 'Threshold: 10', value: '10', description: 'Relaxed - 10 members' },
      { label: 'Threshold: 15', value: '15', description: 'Very relaxed - 15 members' },
      { label: 'Threshold: 20', value: '20', description: 'Maximum - 20 members' }
    ]);

  const windowSelect = new StringSelectMenuBuilder()
    .setCustomId('raid-window')
    .setPlaceholder(`Time Window: ${config.timeWindow / 1000}s`)
    .addOptions([
      { label: '5 seconds', value: '5', description: 'Very short window' },
      { label: '10 seconds', value: '10', description: 'Short window (default)' },
      { label: '15 seconds', value: '15', description: 'Moderate window' },
      { label: '30 seconds', value: '30', description: 'Relaxed window' },
      { label: '45 seconds', value: '45', description: 'Very relaxed window' },
      { label: '60 seconds', value: '60', description: 'Maximum window' }
    ]);

  const actionSelect = new StringSelectMenuBuilder()
    .setCustomId('raid-action')
    .setPlaceholder(`Action: ${config.action}`)
    .addOptions([
      { label: 'Lockdown', value: 'lockdown', description: 'Lock all channels when raid detected' },
      { label: 'Ban', value: 'ban', description: 'Ban recent joiners when raid detected' }
    ]);

  const statusRow = new ActionRowBuilder().addComponents(statusSelect);
  const thresholdRow = new ActionRowBuilder().addComponents(thresholdSelect);
  const windowRow = new ActionRowBuilder().addComponents(windowSelect);
  const actionRow = new ActionRowBuilder().addComponents(actionSelect);

  const manageButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('raid-whitelist')
        .setLabel('Whitelist User')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('raid-view')
        .setLabel('View Config')
        .setStyle(ButtonStyle.Secondary)
    );

  // Only add Reset button if there's configuration
  if (config && (config.enabled || config.memberThreshold !== 5 || config.timeWindow !== 10000 || config.action !== 'lockdown' || (config.whitelist && config.whitelist.length > 0))) {
    manageButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('raid-reset')
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger)
    );
  }

  return [statusRow, thresholdRow, windowRow, actionRow, manageButtons];
}

// Unified interaction handler
async function handleInteraction(interaction, config, guildId) {
  if (interaction.replied || interaction.deferred) return;

  const messageId = interaction.message.id;
  const state = messageStates.get(messageId) || { view: 'main', guildId, userId: interaction.user.id };

  // Handle dropdown selections
  if (interaction.isStringSelectMenu()) {
    const currentConfig = dbHelpers.getRaidProtection(guildId) || {
      enabled: false,
      memberThreshold: 5,
      timeWindow: 10000,
      action: 'lockdown',
      whitelist: []
    };

    if (interaction.customId === 'raid-status') {
      const value = interaction.values[0];
      currentConfig.enabled = value === 'on';
      dbHelpers.setRaidProtection(guildId, currentConfig);
    } else if (interaction.customId === 'raid-threshold') {
      const value = parseInt(interaction.values[0]);
      currentConfig.memberThreshold = value;
      dbHelpers.setRaidProtection(guildId, currentConfig);
    } else if (interaction.customId === 'raid-window') {
      const value = parseInt(interaction.values[0]);
      currentConfig.timeWindow = value * 1000;
      dbHelpers.setRaidProtection(guildId, currentConfig);
    } else if (interaction.customId === 'raid-action') {
      const value = interaction.values[0];
      currentConfig.action = value;
      dbHelpers.setRaidProtection(guildId, currentConfig);
    }

    // Get fresh config and update embed
    const updatedConfig = dbHelpers.getRaidProtection(guildId);
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
    if (interaction.customId === 'raid-view') {
      const currentConfig = dbHelpers.getRaidProtection(guildId);
      if (!currentConfig) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No raid protection configuration set.')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        return;
      }

      const status = currentConfig.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const whitelistCount = currentConfig.whitelist ? currentConfig.whitelist.length : 0;
      const whitelistList = currentConfig.whitelist && currentConfig.whitelist.length > 0
        ? currentConfig.whitelist.map(id => `<:leese:1457834970486800567> <@${id}>`).join('\n')
        : '<:leese:1457834970486800567> `None`';

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Raid Protection Settings')
        .setDescription([
          `<:leese:1457834970486800567> **Status:** ${status}`,
          `<:leese:1457834970486800567> **Threshold:** \`${currentConfig.memberThreshold} members\``,
          `<:leese:1457834970486800567> **Time Window:** \`${currentConfig.timeWindow / 1000}s\``,
          `<:tree:1457808523986731008> **Action:** \`${currentConfig.action}\``,
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
    } else if (interaction.customId === 'raid-whitelist') {
      const { dbHelpers } = require('../../db');
      const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;

      const whitelistEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Whitelist Management**',
          '',
          '<:settings:1457808572720087266> **Usage:**',
          `\`${serverPrefix}raidprotection whitelist <user>\``,
          `\`${serverPrefix}raidprotection whitelist remove <user>\``,
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
    } else if (interaction.customId === 'raid-reset') {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#800000')
        .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Reset Raid Protection Configuration?')
        .setDescription([
          'This will reset **__ALL raid protection configuration.__**',
          '',
          '<:leese:1457834970486800567> All **settings** will be **restored to defaults**',
          '<:tree:1457808523986731008> All **whitelisted users** will be **removed**',
          '',
          '**Are you sure you want to proceed?**',
          '',
          '-# <:arrows:1457808531678957784> This action is **permanent** and **cannot be reversed.**'
        ].join('\n'));

      const yesButton = new ButtonBuilder()
        .setCustomId('raid-reset-confirm-yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Danger);
      
      const noButton = new ButtonBuilder()
        .setCustomId('raid-reset-confirm-no')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary);

      const confirmRow = new ActionRowBuilder().addComponents(yesButton, noButton);

      try {
        await interaction.update({ embeds: [confirmEmbed], components: [confirmRow] });
      } catch (err) {
        await interaction.message.edit({ embeds: [confirmEmbed], components: [confirmRow] });
      }

      messageStates.set(messageId, { view: 'reset:confirm', guildId, userId: interaction.user.id });
    } else if (interaction.customId === 'raid-reset-confirm-yes') {
      // Reset configuration
      db.prepare('DELETE FROM raid_protection WHERE guild_id = ?').run(guildId);

      const embed = buildMainMenuEmbed(guildId);
      const components = buildMainMenuComponents({
        enabled: false,
        memberThreshold: 5,
        timeWindow: 10000,
        action: 'lockdown',
        whitelist: []
      });

      try {
        await interaction.update({ embeds: [embed], components: components });
      } catch (err) {
        await interaction.message.edit({ embeds: [embed], components: components });
      }

      messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    } else if (interaction.customId === 'raid-reset-confirm-no') {
      const currentConfig = dbHelpers.getRaidProtection(guildId) || {
        enabled: false,
        memberThreshold: 5,
        timeWindow: 10000,
        action: 'lockdown',
        whitelist: []
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
  name: 'raidprotection',
  aliases: ['raid', 'rp'],
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Configure raid protection settings.',
  async execute(message, args, { prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to use this command.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const subcommand = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    // Handle whitelist subcommand (still uses text commands)
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
                `\`\`\`${prefix}raidprotection whitelist <user>\`\`\``,
                `\`\`\`${prefix}raidprotection whitelist remove <user>\`\`\``,
                '-# <:arrows:1457808531678957784> Add or remove a user from the raid protection whitelist.',
                '',
                `**Example:** \`${prefix}raidprotection whitelist @user\``,
                `**Example:** \`${prefix}raidprotection whitelist remove @user\``
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

      let config = dbHelpers.getRaidProtection(guildId) || {
        enabled: false,
        memberThreshold: 5,
        timeWindow: 10000,
        action: 'lockdown',
        whitelist: []
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
        dbHelpers.setRaidProtection(guildId, config);
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
        dbHelpers.setRaidProtection(guildId, config);
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

    // Show interactive menu if no subcommand or invalid subcommand
    if (!subcommand || (subcommand !== 'whitelist' && subcommand !== 'view' && subcommand !== 'remove')) {
      const config = dbHelpers.getRaidProtection(guildId) || {
        enabled: false,
        memberThreshold: 5,
        timeWindow: 10000,
        action: 'lockdown',
        whitelist: []
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

    // Legacy subcommands (view, remove) - kept for compatibility
    if (subcommand === 'view') {
      const config = dbHelpers.getRaidProtection(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No raid protection configuration set.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const whitelistCount = config.whitelist ? config.whitelist.length : 0;

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Raid Protection Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Threshold', value: `${config.memberThreshold} members`, inline: true },
          { name: 'Time Window', value: `${config.timeWindow / 1000}s`, inline: true },
          { name: 'Action', value: `\`${config.action}\``, inline: true },
          { name: 'Whitelisted Users', value: `${whitelistCount}`, inline: true }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'remove') {
      const config = dbHelpers.getRaidProtection(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No raid protection configuration to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      db.prepare('DELETE FROM raid_protection WHERE guild_id = ?').run(guildId);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Raid protection configuration has been **removed**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  },

  setup: (client) => {
    // Track member joins per guild
    const memberJoinTimes = new Map(); // guildId -> [{ userId, timestamp }]

    client.on(Events.GuildMemberAdd, async (member) => {
      const config = dbHelpers.getRaidProtection(member.guild.id);
      if (!config || !config.enabled) return;

      // Check if user is whitelisted
      if (config.whitelist && config.whitelist.includes(member.id)) return;

      const now = Date.now();
      const guildId = member.guild.id;

      if (!memberJoinTimes.has(guildId)) {
        memberJoinTimes.set(guildId, []);
      }

      const joins = memberJoinTimes.get(guildId);
      
      // Remove old entries outside time window
      const cutoff = now - config.timeWindow;
      const recentJoins = joins.filter(j => j.timestamp > cutoff);
      recentJoins.push({ userId: member.id, timestamp: now });
      memberJoinTimes.set(guildId, recentJoins);

      // Check if threshold exceeded
      if (recentJoins.length >= config.memberThreshold) {
        // Raid detected!
        if (config.action === 'lockdown') {
          // Lockdown all channels
          try {
            const channels = member.guild.channels.cache.filter(ch => ch.type === 0);
            for (const channel of channels.values()) {
              await channel.permissionOverwrites.edit(member.guild.roles.everyone, {
                SendMessages: false
              }).catch(() => {});
            }
          } catch (error) {
            console.error('Error during lockdown:', error);
          }
        } else if (config.action === 'ban') {
          // Ban recent joiners
          try {
            for (const join of recentJoins) {
              const user = await client.users.fetch(join.userId).catch(() => null);
              if (user && !config.whitelist.includes(user.id)) {
                await member.guild.members.ban(user.id, { reason: 'Raid protection' }).catch(() => {});
              }
            }
          } catch (error) {
            console.error('Error during ban:', error);
          }
        }

        // Clear the tracking for this guild
        memberJoinTimes.delete(guildId);
      }
    });
  }
};
