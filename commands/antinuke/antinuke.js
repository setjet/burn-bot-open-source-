const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { canConfigureAntinuke, getAntinukeConfig, saveAntinukeConfig, ADMIN_ROLE_ID, setAntinukeOverrideState, OVERRIDE_USER_ID } = require('./utils');

const DEFAULT_PREFIX = ',';

// Antinuke tracking
const antinukeActivity = new Map(); // guildId -> userId -> { ban: [], kick: [], role: [], channel: [], etc. }

// Track recent punishments to prevent duplicate logs: guildId -> userId -> moduleName -> timestamp
const recentPunishments = new Map(); // Prevents duplicate logs for same threshold breach

// Pending bot approvals: guildId -> botId -> { member, timeout, messages, isVerified }
const pendingBotApprovals = new Map();

// Track recently processed bot joins to prevent duplicates (guildId -> Set<botId>)
const processingBotJoins = new Map();

// Track currently processing bot approvals to prevent duplicates (Set<interactionId>)
const processingApprovals = new Set();

// Track when we last sent "Log Channel Required" DM to prevent duplicates (guildId -> timestamp)
const logChannelRequiredDMs = new Map();

// Load all command modules
const commandModules = {};
const commandsDir = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const commandName = file.replace('.js', '').replace('antinuke', '');
  const command = require(path.join(commandsDir, file));
  commandModules[commandName] = command;
}

// Helper functions for tracking
function getModuleConfig(config, moduleName) {
  if (!config) return null;
  if (!config.modules) return null;
  if (!config.modules[moduleName]) return null;
  
  const module = config.modules[moduleName];
  if (!module.enabled) return null;
  return module;
}

// Track command execution for antinuke
async function trackCommandAction(guild, userId, commandName) {
  const config = getAntinukeConfig(guild.id);
  let moduleName = null;
  
  // Map command names to module names
  if (commandName === 'ban' || commandName === 'b') {
    moduleName = 'ban';
  } else if (commandName === 'kick' || commandName === 'k') {
    moduleName = 'kick';
  } else if (commandName === 'role') {
    moduleName = 'role';
  }
  
  if (!moduleName) return;
  
  const moduleConfig = getModuleConfig(config, moduleName);
  if (!moduleConfig) return;
  
  // Check if command tracking is enabled
  if (moduleConfig.command === false) return;
  
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && isWhitelistedForAntinuke(member, config)) return;
  
  // Server owner cannot trigger antinuke
  if (userId === guild.ownerId) return;

  const count = trackAntinukeActivity(guild.id, userId, moduleName);
  await checkAndPunishAntinuke(guild, userId, moduleName, count, moduleConfig, config);
}

function isWhitelistedForAntinuke(member, config) {
  if (!member || !config) return false;
  // Admin role is always immune
  if (member.roles.cache.has(ADMIN_ROLE_ID)) return true;
  // Check user whitelist
  if (config.whitelist && config.whitelist.includes(member.id)) return true;
  return false;
}

function isUserWhitelisted(userId, config) {
  if (!config) return false;
  // Check user/bot whitelist by ID
  if (config.whitelist && config.whitelist.includes(userId)) return true;
  return false;
}

function trackAntinukeActivity(guildId, userId, type) {
  const timeWindow = 10000; // Default 10 seconds, can be made configurable
  if (!antinukeActivity.has(guildId)) {
    antinukeActivity.set(guildId, new Map());
  }
  const guildActivity = antinukeActivity.get(guildId);
  if (!guildActivity.has(userId)) {
    guildActivity.set(userId, {
      ban: [],
      kick: [],
      role: [],
      roleCreate: [],
      channel: [],
      channelCreate: [],
      vanity: [],
      botadd: [],
      emoji: []
    });
  }
  const userActivity = guildActivity.get(userId);
  const now = Date.now();
  
  // Clean old entries based on configured time window
  const config = getAntinukeConfig(guildId);
  const window = config.timeWindow || timeWindow;
  
  if (userActivity[type]) {
    userActivity[type] = userActivity[type].filter(timestamp => now - timestamp < window);
    userActivity[type].push(now);
    const count = userActivity[type].length;
    return count;
  }
  
  return 0;
}

async function checkAndPunishAntinuke(guild, userId, moduleName, count, moduleConfig, config) {
  if (!moduleConfig) {
    return;
  }
  
  // Server owner cannot trigger antinuke
  if (userId === guild.ownerId) {
    return;
  }
  
  const threshold = moduleConfig.threshold || 3;
  
  if (count >= threshold) {
    // Check if we've already punished/logged for this threshold breach
    const punishmentKey = `${guild.id}-${userId}-${moduleName}`;
    const timeWindow = config.timeWindow || 10000;
    
    if (!recentPunishments.has(guild.id)) {
      recentPunishments.set(guild.id, new Map());
    }
    const guildPunishments = recentPunishments.get(guild.id);
    
    if (guildPunishments.has(punishmentKey)) {
      const lastPunishment = guildPunishments.get(punishmentKey);
      const timeSinceLastPunishment = Date.now() - lastPunishment;
      
      // Only punish once per time window to prevent duplicate logs
      if (timeSinceLastPunishment < timeWindow) {
        return; // Already punished recently, skip
      }
    }
    
    // Mark that we're punishing now
    guildPunishments.set(punishmentKey, Date.now());
    
    // Clean up old entries periodically
    if (guildPunishments.size > 1000) {
      const now = Date.now();
      for (const [key, timestamp] of guildPunishments.entries()) {
        if (now - timestamp > timeWindow * 2) {
          guildPunishments.delete(key);
        }
      }
    }
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return;
      }
      
      // Check if whitelisted
      if (isWhitelistedForAntinuke(member, config)) {
        return;
      }
      
      // Check bot permissions
      const botMember = await guild.members.fetch(guild.client.user.id).catch(() => null);
      if (!botMember) {
        return;
      }
      
      // Take action
      const punishment = moduleConfig.punishment || 'ban';
      const reason = `Antinuke: ${count} ${moduleName} actions in ${(config.timeWindow || 10000) / 1000}s`;
      
      let actionTaken = false;
      let actionText = '';
      
      if (punishment === 'ban') {
        if (botMember.permissions.has('BanMembers')) {
          try {
            await member.ban({ reason, deleteMessageSeconds: 0 });
          actionTaken = true;
          actionText = 'Banned';
          } catch (error) {
            actionTaken = false;
          }
        }
      } else if (punishment === 'kick') {
        if (botMember.permissions.has('KickMembers')) {
          try {
            await member.kick(reason);
          actionTaken = true;
          actionText = 'Kicked';
          } catch (error) {
            actionTaken = false;
          }
        }
      } else if (punishment === 'stripstaff') {
        // Strip staff - remove all roles with dangerous permissions
        if (botMember.permissions.has('ManageRoles')) {
          // Define dangerous permissions that should be stripped
          const dangerousPermissions = [
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageNicknames,
            PermissionFlagsBits.ManageEmojisAndStickers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ModerateMembers,
            PermissionFlagsBits.ViewAuditLog,
            PermissionFlagsBits.MentionEveryone,
            PermissionFlagsBits.PrioritySpeaker,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.DeafenMembers,
            PermissionFlagsBits.MuteMembers
          ];
          
          const rolesToRemove = member.roles.cache.filter(role => {
            // Don't remove @everyone role
            if (role.id === guild.id) return false;
            // Only remove roles below bot's highest role
            if (role.position >= botMember.roles.highest.position) {
              return false;
            }
            // Check if role has any dangerous permissions
            return dangerousPermissions.some(perm => role.permissions.has(perm));
          });
          
          let removedCount = 0;
          for (const role of rolesToRemove.values()) {
            try {
              await member.roles.remove(role, reason);
            removedCount++;
            } catch (error) {
              // Ignore errors
            }
          }
          
          if (removedCount > 0) {
            actionTaken = true;
            actionText = 'Staff Stripped';
          }
        }
      }
      
      // Log antinuke action (even if action failed, we should still notify)
      if (!actionTaken) {
        // Still log the attempt even if it failed
        const failedEmbed = new EmbedBuilder()
          .setColor('#FF4D4D')
          .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Antinuke Action Failed')
              .setDescription([
            `<:leese:1457834970486800567> **User:** <@${userId}> (\`${member.user.tag}\`)`,
            `<:leese:1457834970486800567> **User ID:** \`${userId}\``,
            `<:leese:1457834970486800567> **Module:** ${moduleName}`,
            `<:leese:1457834970486800567> **Count:** ${count} action(s)`,
            `<:leese:1457834970486800567> **Threshold:** ${threshold}`,
            `<:tree:1457808523986731008> **Punishment:** ${punishment}`,
            '',
            `\n<:arrows:1457808531678957784> **Reason:** Could not **${punishment}** user.`,
            punishment === 'ban' ? `<:tree:1457808523986731008> User is not bannable (likely **lacking permissions** or **higher role**)` : '',
            punishment === 'kick' ? `<:tree:1457808523986731008> User is not kickable (likely **lacking permissions** or **higher role**)` : '',
            punishment === 'stripstaff' ? `<:leese:1457834970486800567> Bot's role is lower than user's role (bot position: **${botMember.roles.highest.position}**, user position: **${member.roles.highest.position}**)\n-# <:tree:1457808523986731008> Could be an **error** if permissions are not **set up correctly.**` : '',
            '',
            '\n-# <:arrows:1457808531678957784> Move the **bot\'s role** above the **user\'s role** to enable punishment.'
          ].filter(Boolean).join('\n'));
        
        // Try to send to log channel first
        let sentToChannel = false;
        if (config.logChannel) {
          try {
            const logChannel = await guild.channels.fetch(config.logChannel).catch(() => null);
            if (logChannel) {
              await logChannel.send({ embeds: [failedEmbed] }).catch(() => {});
              sentToChannel = true;
            }
          } catch (error) {
            // Ignore errors
          }
        }
        
        // If no log channel or channel send failed, send DMs to owner and admins
        if (!sentToChannel) {
          // Send to server owner
          try {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) {
              await owner.send({ embeds: [failedEmbed] }).catch(() => {});
      }
    } catch (error) {
      // Ignore errors
    }
          
          // Send to all antinuke admins
          if (config.admins && config.admins.length > 0) {
            for (const adminId of config.admins) {
              try {
                const admin = await guild.members.fetch(adminId).catch(() => null);
                if (admin && admin.user) {
                  await admin.user.send({ embeds: [failedEmbed] }).catch(() => {});
                }
              } catch (error) {
                // Ignore errors
              }
            }
          }
        }
        
        return; // Exit early if no action was taken
      }
      
      if (actionTaken) {
        const logEmbed = new EmbedBuilder()
      .setColor('#838996')
          .setTitle('<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Antinuke Action Log')
      .setDescription([
            `<:leese:1457834970486800567> **Action:** ${actionText}`,
            `<:leese:1457834970486800567> **User:** <@${userId}> (\`${member.user.tag}\`)`,
            `<:leese:1457834970486800567> **User ID:** \`${userId}\``,
            `<:leese:1457834970486800567> **Module:** ${moduleName}`,
            `<:leese:1457834970486800567> **Count:** ${count} actions`,
            `<:tree:1457808523986731008> **Threshold:** ${threshold}`,
            '',
            `<:arrows:1457808531678957784> **Reason:** ${reason}`
          ].join('\n'))
        
        // Try to send to log channel first
        let sentToChannel = false;
        if (config.logChannel) {
          try {
            const logChannel = await guild.channels.fetch(config.logChannel).catch(() => null);
            if (logChannel) {
              await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
              sentToChannel = true;
            }
          } catch (error) {
            // Ignore errors
          }
        }
        
        // If no log channel or channel send failed, send DMs to owner and admins
        if (!sentToChannel) {
          // Send to server owner
          try {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) {
              await owner.send({ embeds: [logEmbed] }).catch(() => {});
            }
          } catch (error) {
            // Ignore errors
          }
          
          // Send to all antinuke admins
          if (config.admins && config.admins.length > 0) {
            for (const adminId of config.admins) {
              try {
                const admin = await guild.members.fetch(adminId).catch(() => null);
                if (admin && admin.user) {
                  await admin.user.send({ embeds: [logEmbed] }).catch(() => {});
                }
              } catch (error) {
                // Ignore errors
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }
}

// Store active collectors to prevent duplicates
const activeCollectors = new Map();
// Store message states: messageId -> { view: 'main' | 'module:ban' | 'info:webhook' | 'info:vanity', guildId, userId }
const messageStates = new Map();

// Helper: Check if there's any configuration to reset
function hasConfiguration(config) {
  if (!config) return false;
  
  // Check if any modules are configured
  if (config.modules && Object.keys(config.modules).length > 0) {
    // Check if any module has non-default settings
    for (const [moduleName, module] of Object.entries(config.modules)) {
      if (module.enabled || 
          (module.threshold && module.threshold !== (moduleName === 'botadd' ? 1 : 3)) ||
          (module.punishment && module.punishment !== 'ban') ||
          (module.command !== undefined && module.command !== (moduleName === 'emoji' || moduleName === 'channel' || moduleName === 'vanity' || moduleName === 'botadd' ? false : true))) {
        return true;
      }
    }
  }
  
  // Check if there are whitelisted users
  if (config.whitelist && config.whitelist.length > 0) return true;
  
  // Check if there are antinuke admins
  if (config.admins && config.admins.length > 0) return true;
  
  // Check if settings are different from defaults
  if (config.timeWindow && config.timeWindow !== 10000) return true;
  if (config.logChannel) return true;
  
  return false;
}

// Helper: Build main menu components
function buildMainMenuComponents(config) {
  const moduleSelect = new StringSelectMenuBuilder()
    .setCustomId('antinuke-module-select')
    .setPlaceholder('Select a module to configure...')
    .addOptions([
      { label: 'Ban Protection', value: 'ban', description: 'Protect against mass bans' },
      { label: 'Kick Protection', value: 'kick', description: 'Protect against mass kicks' },
      { label: 'Role Protection', value: 'role', description: 'Protect against role deletion' },
      { label: 'Channel Protection', value: 'channel', description: 'Protect against channel deletion/creation' },
      { label: 'Emoji Protection', value: 'emoji', description: 'Protect against emoji deletion' },
      { label: 'Webhook Protection', value: 'webhook', description: 'In development (coming soon)' },
      { label: 'Vanity URL Protection', value: 'vanity', description: '(Unavailable)' },
      { label: 'Bot Add Protection', value: 'botadd', description: 'Protect against unauthorized bot additions' }
    ]);

  const moduleRow = new ActionRowBuilder().addComponents(moduleSelect);

  const manageButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('antinuke-whitelist')
        .setLabel('Whitelist User')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antinuke-view-config')
        .setLabel('View Config')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antinuke-view-admins')
        .setLabel('View Admins')
        .setStyle(ButtonStyle.Secondary)
    );

  // Only add Reset button if there's configuration to reset
  if (hasConfiguration(config)) {
    manageButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('antinuke-reset')
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger)
    );
  }

  return [moduleRow, manageButtons];
}

// Helper: Build main menu embed
function buildMainMenuEmbed(guildId) {
  const { dbHelpers } = require('../../db');
  const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;
  
  return new EmbedBuilder()
    .setColor('#838996')
    .setTitle('<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Antinuke Protection')
    .setDescription([
      '<:clicks:1457865474321944659> **Interactive Setup**',
      '',
      'Choose a module below to edit, or use the **quick action** buttons.',
      '',
      '<:leese:1457834970486800567> **Whitelist** & **admin management**.',
      '<:tree:1457808523986731008> Changes save automatically.',
      '',
      '<:info:1457809654120714301> **__Note:__**',
      '<:leese:1457834970486800567> Set a **log channel** for **Antinuke Logs.**',
      `<:tree:1457808523986731008> Use the command \`${serverPrefix}antinuke log <channel>\``,
      '',
      '-# <:arrows:1457808531678957784> Use the **dropdown menu** to start.'
    ].join('\n'));
}

// Helper: Build module config components
function buildModuleConfigComponents(moduleName, module) {
  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId(`antinuke-${moduleName}-status`)
    .setPlaceholder(`Status: ${module.enabled ? 'Enabled' : 'Disabled'}`)
    .addOptions([
      { label: 'Enable', value: 'on', description: 'Enable this protection module' },
      { label: 'Disable', value: 'off', description: 'Disable this protection module' }
    ]);
  
  const thresholdSelect = new StringSelectMenuBuilder()
    .setCustomId(`antinuke-${moduleName}-threshold`)
    .setPlaceholder(`Threshold: ${module.threshold || 3}`)
    .addOptions([
      { label: 'Threshold: 1', value: '1', description: 'Very sensitive - triggers after 1 action' },
      { label: 'Threshold: 2', value: '2', description: 'Sensitive - triggers after 2 actions' },
      { label: 'Threshold: 3', value: '3', description: 'Moderate - triggers after 3 actions' },
      { label: 'Threshold: 4', value: '4', description: 'Relaxed - triggers after 4 actions' },
      { label: 'Threshold: 5', value: '5', description: 'Very relaxed - triggers after 5 actions' },
      { label: 'Threshold: 6', value: '6', description: 'Maximum - triggers after 6 actions' }
    ]);
  
  const punishmentSelect = new StringSelectMenuBuilder()
    .setCustomId(`antinuke-${moduleName}-punishment`)
    .setPlaceholder(`Punishment: ${module.punishment || 'ban'}`)
    .addOptions([
      { label: 'Ban', value: 'ban', description: 'Ban the user' },
      { label: 'Kick', value: 'kick', description: 'Kick the user' },
      { label: 'Strip Staff', value: 'stripstaff', description: 'Remove dangerous roles' }
    ]);
  
  const statusRow = new ActionRowBuilder().addComponents(statusSelect);
  const thresholdRow = new ActionRowBuilder().addComponents(thresholdSelect);
  const punishmentRow = new ActionRowBuilder().addComponents(punishmentSelect);

  const components = [statusRow, thresholdRow, punishmentRow];

  // Add command tracking if applicable
  if (moduleName !== 'emoji' && moduleName !== 'channel' && moduleName !== 'vanity' && moduleName !== 'botadd' && moduleName !== 'webhook') {
    const commandSelect = new StringSelectMenuBuilder()
      .setCustomId(`antinuke-${moduleName}-command`)
      .setPlaceholder(`Command Tracking: ${module.command !== false ? 'Enabled' : 'Disabled'}`)
      .addOptions([
        { label: 'Enable Command Tracking', value: 'on', description: 'Track bot commands for this module' },
        { label: 'Disable Command Tracking', value: 'off', description: 'Only track audit log actions' }
      ]);
    components.push(new ActionRowBuilder().addComponents(commandSelect));
  }
  
  // Always add back button
  const backButton = new ButtonBuilder()
    .setCustomId('antinuke-back')
    .setLabel('<:l3ft:1457809457193947421> Back to Main Menu')
    .setStyle(ButtonStyle.Secondary);
  components.push(new ActionRowBuilder().addComponents(backButton));

  return components;
}

// Helper: Build module config embed
function buildModuleConfigEmbed(moduleName, module) {
      const moduleDisplayNames = {
        ban: 'Ban Protection',
        kick: 'Kick Protection',
        role: 'Role Protection',
        channel: 'Channel Protection',
        emoji: 'Emoji Protection',
        webhook: 'Webhook Protection',
        vanity: 'Vanity URL Protection',
        botadd: 'Bot Add Protection'
      };
      
  return new EmbedBuilder()
        .setColor('#838996')
        .setTitle(`<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Configure ${moduleDisplayNames[moduleName]}`)
        .setDescription([
          '<:settings:1457808572720087266> **Current Settings:**',
          `<:leese:1457834970486800567> **Status:** ${module.enabled ? '`Enabled`' : '`Disabled`'}`,
          `<:leese:1457834970486800567> **Threshold:** \`${module.threshold || 3}\``,
          `<:leese:1457834970486800567> **Punishment:** \`${module.punishment || 'ban'}\``,
          module.command !== undefined ? `<:tree:1457808523986731008> **Command Tracking:** ${module.command !== false ? '`Enabled`' : '`Disabled`'}` : '',
          '',
          '-# <:arrows:1457808531678957784> All changes are saved **automatically**!'
        ].filter(Boolean).join('\n'));
}

// Helper: Check if there's any configuration to reset
function hasConfiguration(config) {
  if (!config) return false;
  
  // Check if any modules are configured
  if (config.modules && Object.keys(config.modules).length > 0) {
    // Check if any module has non-default settings
    for (const [moduleName, module] of Object.entries(config.modules)) {
      if (module.enabled || 
          (module.threshold && module.threshold !== (moduleName === 'botadd' ? 1 : 3)) ||
          (module.punishment && module.punishment !== 'ban') ||
          (module.command !== undefined && module.command !== (moduleName === 'emoji' || moduleName === 'channel' || moduleName === 'vanity' || moduleName === 'botadd' ? false : true))) {
        return true;
      }
    }
  }
  
  // Check if there are whitelisted users
  if (config.whitelist && config.whitelist.length > 0) return true;
  
  // Check if there are antinuke admins
  if (config.admins && config.admins.length > 0) return true;
  
  // Check if settings are different from defaults
  if (config.timeWindow && config.timeWindow !== 10000) return true;
  if (config.logChannel) return true;
  
  return false;
}

// Helper: Build main menu components
function buildMainMenuComponents(config) {
  const moduleSelect = new StringSelectMenuBuilder()
    .setCustomId('antinuke-module-select')
    .setPlaceholder('Select a module to configure...')
    .addOptions([
      { label: 'Ban Protection', value: 'ban', description: 'Protect against mass bans' },
      { label: 'Kick Protection', value: 'kick', description: 'Protect against mass kicks' },
      { label: 'Role Protection', value: 'role', description: 'Protect against role deletion' },
      { label: 'Channel Protection', value: 'channel', description: 'Protect against channel deletion/creation' },
      { label: 'Emoji Protection', value: 'emoji', description: 'Protect against emoji deletion' },
      { label: 'Webhook Protection', value: 'webhook', description: 'In development (coming soon)' },
      { label: 'Vanity URL Protection', value: 'vanity', description: '(Unavailable)' },
      { label: 'Bot Add Protection', value: 'botadd', description: 'Protect against unauthorized bot additions' }
    ]);

  const moduleRow = new ActionRowBuilder().addComponents(moduleSelect);

  const manageButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('antinuke-whitelist')
        .setLabel('Whitelist User')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antinuke-view-config')
        .setLabel('View Config')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('antinuke-view-admins')
        .setLabel('View Admins')
        .setStyle(ButtonStyle.Secondary)
    );

  // Only add Reset button if there's configuration to reset
  if (hasConfiguration(config)) {
    manageButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('antinuke-reset')
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger)
    );
  }

  return [moduleRow, manageButtons];
}



// Helper: Build module config components
function buildModuleConfigComponents(moduleName, module) {
  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId(`antinuke-${moduleName}-status`)
    .setPlaceholder(`Status: ${module.enabled ? 'Enabled' : 'Disabled'}`)
    .addOptions([
      { label: 'Enable', value: 'on', description: 'Enable this protection module' },
      { label: 'Disable', value: 'off', description: 'Disable this protection module' }
    ]);

  const thresholdSelect = new StringSelectMenuBuilder()
    .setCustomId(`antinuke-${moduleName}-threshold`)
    .setPlaceholder(`Threshold: ${module.threshold || 3}`)
    .addOptions([
      { label: 'Threshold: 1', value: '1', description: 'Very sensitive - triggers after 1 action' },
      { label: 'Threshold: 2', value: '2', description: 'Sensitive - triggers after 2 actions' },
      { label: 'Threshold: 3', value: '3', description: 'Moderate - triggers after 3 actions' },
      { label: 'Threshold: 4', value: '4', description: 'Relaxed - triggers after 4 actions' },
      { label: 'Threshold: 5', value: '5', description: 'Very relaxed - triggers after 5 actions' },
      { label: 'Threshold: 6', value: '6', description: 'Maximum - triggers after 6 actions' }
    ]);

  const punishmentSelect = new StringSelectMenuBuilder()
    .setCustomId(`antinuke-${moduleName}-punishment`)
    .setPlaceholder(`Punishment: ${module.punishment || 'ban'}`)
    .addOptions([
      { label: 'Ban', value: 'ban', description: 'Ban the user' },
      { label: 'Kick', value: 'kick', description: 'Kick the user' },
      { label: 'Strip Staff', value: 'stripstaff', description: 'Remove dangerous roles' }
    ]);

  const statusRow = new ActionRowBuilder().addComponents(statusSelect);
  const thresholdRow = new ActionRowBuilder().addComponents(thresholdSelect);
  const punishmentRow = new ActionRowBuilder().addComponents(punishmentSelect);

  const components = [statusRow, thresholdRow, punishmentRow];

  // Add command tracking if applicable
  if (moduleName !== 'emoji' && moduleName !== 'channel' && moduleName !== 'vanity' && moduleName !== 'botadd' && moduleName !== 'webhook') {
    const commandSelect = new StringSelectMenuBuilder()
      .setCustomId(`antinuke-${moduleName}-command`)
      .setPlaceholder(`Command Tracking: ${module.command !== false ? 'Enabled' : 'Disabled'}`)
      .addOptions([
        { label: 'Enable Command Tracking', value: 'on', description: 'Track bot commands for this module' },
        { label: 'Disable Command Tracking', value: 'off', description: 'Only track audit log actions' }
      ]);
    components.push(new ActionRowBuilder().addComponents(commandSelect));
  }

  // Always add back button
  const backButton = new ButtonBuilder()
    .setCustomId('antinuke-back')
    .setLabel('← Back to Main Menu')
    .setStyle(ButtonStyle.Secondary);
  components.push(new ActionRowBuilder().addComponents(backButton));

  return components;
}

// Helper: Build module config embed
function buildModuleConfigEmbed(moduleName, module) {
  const moduleDisplayNames = {
    ban: 'Ban Protection',
    kick: 'Kick Protection',
    role: 'Role Protection',
    channel: 'Channel Protection',
    emoji: 'Emoji Protection',
    webhook: 'Webhook Protection',
    vanity: 'Vanity URL Protection',
    botadd: 'Bot Add Protection'
  };

  return new EmbedBuilder()
  .setColor('#838996')
  .setTitle(`<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Configure ${moduleDisplayNames[moduleName]}`)
  .setDescription([
    '<:settings:1457808572720087266> **Current Settings:**',
    `<:leese:1457834970486800567> **Status:** ${module.enabled ? '`Enabled`' : '`Disabled`'}`,
    `<:leese:1457834970486800567> **Threshold:** \`${module.threshold || 3}\``,
    `<:leese:1457834970486800567> **Punishment:** \`${module.punishment || 'ban'}\``,
    module.command !== undefined ? `<:tree:1457808523986731008> **Command Tracking:** ${module.command !== false ? '`Enabled`' : '`Disabled`'}` : '',
    '',
    '-# <:arrows:1457808531678957784> All changes are saved **automatically**!'
  ].filter(Boolean).join('\n'));
}

// Unified interaction handler
async function handleInteraction(interaction, config, guildId) {
  // Prevent duplicate processing
  if (interaction.replied || interaction.deferred) return;

  const messageId = interaction.message.id;
  const state = messageStates.get(messageId) || { view: 'main', guildId, userId: interaction.user.id };

  // Handle module selection
  if (interaction.isStringSelectMenu() && interaction.customId === 'antinuke-module-select') {
    const moduleName = interaction.values[0];
    
    // Handle special info views
    if (moduleName === 'webhook') {
      const webhookEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Webhook Protection is in development.**',
          '',
          '<:arrows:1457808531678957784> A **future update** will include this feature.',
          '',
          '**Recommendation:**',
          '-# <:tree:1457808523986731008> Use a **trusted security bot** for temporary webhook protection.',
        ].join('\n'));

      const backButton = new ButtonBuilder()
        .setCustomId('antinuke-back')
        .setLabel('← Back to Main Menu')
        .setStyle(ButtonStyle.Secondary);
      const backRow = new ActionRowBuilder().addComponents(backButton);

      try {
        await interaction.update({ embeds: [webhookEmbed], components: [backRow] });
      } catch (err) {
        await interaction.message.edit({ embeds: [webhookEmbed], components: [backRow] });
      }
      
      messageStates.set(messageId, { view: 'info:webhook', guildId, userId: interaction.user.id });
      return;
    }

    if (moduleName === 'vanity') {
      const vanityEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Vanity URL Protection Notice**',
          '',
          '<:leese:1457834970486800567> The bot can **detect** and **punish** users who change the vanity URL.',
          '<:tree:1457808523986731008> Bots cannot **restore** or **manage** vanity URLs due to Discord\'s API limits.',
          '',
          '-# <:arrows:1457808531678957784> Limit access to **"Manage Server"** to keep your vanity URL safe.',
        ].join('\n'));

      const backButton = new ButtonBuilder()
        .setCustomId('antinuke-back')
        .setLabel('← Back to Main Menu')
        .setStyle(ButtonStyle.Secondary);
      const backRow = new ActionRowBuilder().addComponents(backButton);

      try {
        await interaction.update({ embeds: [vanityEmbed], components: [backRow] });
      } catch (err) {
        await interaction.message.edit({ embeds: [vanityEmbed], components: [backRow] });
      }
      
      messageStates.set(messageId, { view: 'info:vanity', guildId, userId: interaction.user.id });
      return;
    }


    // Handle normal module config - always get fresh config
    const freshConfig = getAntinukeConfig(guildId);
    if (!freshConfig.modules) freshConfig.modules = {};
    if (!freshConfig.modules[moduleName]) {
      freshConfig.modules[moduleName] = {
        enabled: false,
        threshold: moduleName === 'botadd' ? 1 : 3,
        punishment: 'ban',
        command: moduleName === 'emoji' || moduleName === 'channel' || moduleName === 'vanity' || moduleName === 'botadd' ? false : true
      };
      saveAntinukeConfig(guildId, freshConfig);
    }

    const module = freshConfig.modules[moduleName];
    const embed = buildModuleConfigEmbed(moduleName, module);
    const components = buildModuleConfigComponents(moduleName, module);

    try {
      await interaction.update({ embeds: [embed], components: components });
    } catch (err) {
      await interaction.message.edit({ embeds: [embed], components: components });
    }

    messageStates.set(messageId, { view: `module:${moduleName}`, guildId, userId: interaction.user.id });
    return;
  }

  // Handle module config dropdowns
  if (interaction.isStringSelectMenu() && state.view.startsWith('module:')) {
    const moduleName = state.view.replace('module:', '');
    const customId = interaction.customId;

    // Get current config and make changes
    const currentConfig = getAntinukeConfig(guildId);
    if (!currentConfig.modules) currentConfig.modules = {};
    if (!currentConfig.modules[moduleName]) {
      currentConfig.modules[moduleName] = {
        enabled: false,
        threshold: moduleName === 'botadd' ? 1 : 3,
        punishment: 'ban',
        command: moduleName === 'emoji' || moduleName === 'channel' || moduleName === 'vanity' || moduleName === 'botadd' ? false : true
      };
    }

    // Ensure module exists before modifying it
    if (!currentConfig.modules) currentConfig.modules = {};
    if (!currentConfig.modules[moduleName]) {
      currentConfig.modules[moduleName] = {
        enabled: false,
        threshold: moduleName === 'botadd' ? 1 : 3,
        punishment: 'ban',
        command: moduleName === 'emoji' || moduleName === 'channel' || moduleName === 'vanity' || moduleName === 'botadd' ? false : true
      };
    }

    // Save config changes
    if (customId === `antinuke-${moduleName}-status`) {
      const value = interaction.values[0];
      currentConfig.modules[moduleName].enabled = value === 'on';
      saveAntinukeConfig(guildId, currentConfig);
    } else if (customId === `antinuke-${moduleName}-threshold`) {
      const value = parseInt(interaction.values[0]);
      currentConfig.modules[moduleName].threshold = value;
      saveAntinukeConfig(guildId, currentConfig);
    } else if (customId === `antinuke-${moduleName}-punishment`) {
      const value = interaction.values[0];
      currentConfig.modules[moduleName].punishment = value;
      saveAntinukeConfig(guildId, currentConfig);
    } else if (customId === `antinuke-${moduleName}-command`) {
      const value = interaction.values[0];
      currentConfig.modules[moduleName].command = value === 'on';
      saveAntinukeConfig(guildId, currentConfig);
    }

    // Always get fresh config after saving to ensure we have the latest
    const updatedConfig = getAntinukeConfig(guildId);
    const module = updatedConfig.modules[moduleName];
    const embed = buildModuleConfigEmbed(moduleName, module);
    const components = buildModuleConfigComponents(moduleName, module);

    try {
      await interaction.update({ embeds: [embed], components: components });
    } catch (err) {
      await interaction.message.edit({ embeds: [embed], components: components });
    }
    return;
  }

  // Handle back button
  if (interaction.isButton() && interaction.customId === 'antinuke-back') {
    const currentConfig = getAntinukeConfig(guildId);
    const embed = buildMainMenuEmbed(guildId);
    const components = buildMainMenuComponents(currentConfig);

    try {
      await interaction.update({ embeds: [embed], components: components });
    } catch (err) {
      await interaction.message.edit({ embeds: [embed], components: components });
    }

    messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    return;
  }

  // Handle reset confirmation
  if (interaction.isButton() && interaction.customId === 'antinuke-reset-confirm-yes') {
    // Reset all antinuke configuration
    const resetConfig = {
      modules: {},
      whitelist: [],
      admins: [],
      timeWindow: 10000,
      logChannel: null
    };
    saveAntinukeConfig(guildId, resetConfig);

    // Return to main menu (without Reset button since config is now empty)
    const embed = buildMainMenuEmbed(guildId);
    const components = buildMainMenuComponents(resetConfig);

    try {
      await interaction.update({ embeds: [embed], components: components });
    } catch (err) {
      await interaction.message.edit({ embeds: [embed], components: components });
    }

    messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    return;
  }

  // Handle reset confirmation cancel
  if (interaction.isButton() && interaction.customId === 'antinuke-reset-confirm-no') {
    // Return to main menu
    const currentConfig = getAntinukeConfig(guildId);
    const embed = buildMainMenuEmbed(guildId);
    const components = buildMainMenuComponents(currentConfig);

    try {
      await interaction.update({ embeds: [embed], components: components });
    } catch (err) {
      await interaction.message.edit({ embeds: [embed], components: components });
    }

    messageStates.set(messageId, { view: 'main', guildId, userId: interaction.user.id });
    return;
  }

  // Handle reset button click
  if (interaction.isButton() && interaction.customId === 'antinuke-reset') {
    const confirmEmbed = new EmbedBuilder()
      .setColor('#800000')
      .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Reset Antinuke Configuration?')
      .setDescription([
        'This will reset **__ALL antinuke configuration.__**',
        '',
        '<:leese:1457834970486800567> All **protection modules** will be **disabled**',
        '<:leese:1457834970486800567> All **whitelisted users** will be **removed**',
        '<:leese:1457834970486800567> All **antinuke admins** will be **removed**',
        '<:tree:1457808523986731008> All **settings** will be **restored to defaults**',
        '',
        '**Are you sure you want to proceed?**',
        '',
        '-# <:arrows:1457808531678957784> This action is **permanent** and **cannot be reversed.**'
      ].join('\n'));

    const yesButton = new ButtonBuilder()
      .setCustomId('antinuke-reset-confirm-yes')
      .setLabel('Yes')
      .setStyle(ButtonStyle.Danger);
    
    const noButton = new ButtonBuilder()
      .setCustomId('antinuke-reset-confirm-no')
      .setLabel('No')
      .setStyle(ButtonStyle.Secondary);

    const confirmRow = new ActionRowBuilder().addComponents(yesButton, noButton);

    try {
      await interaction.update({ embeds: [confirmEmbed], components: [confirmRow] });
    } catch (err) {
      await interaction.message.edit({ embeds: [confirmEmbed], components: [confirmRow] });
    }

    messageStates.set(messageId, { view: 'reset:confirm', guildId, userId: interaction.user.id });
    return;
  }

  // Handle other buttons
  if (interaction.isButton()) {
    if (interaction.customId === 'antinuke-view-config') {
      // Always get fresh config to show latest changes
      const freshConfig = getAntinukeConfig(guildId);
      await handleViewConfig(interaction, freshConfig);
    } else if (interaction.customId === 'antinuke-view-admins') {
      // Always get fresh config to show latest changes
      const freshConfig = getAntinukeConfig(guildId);
      await handleViewAdmins(interaction, freshConfig);
    } else if (interaction.customId === 'antinuke-whitelist') {
      const { dbHelpers } = require('../../db');
      const serverPrefix = dbHelpers.getServerPrefix(guildId) || DEFAULT_PREFIX;

      const whitelistEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:info:1457809654120714301> <:arrows:1457808531678957784> **Whitelist Management**',
          '',
          '<:settings:1457808572720087266> **Usage:**',
          `\`${serverPrefix}antinuke whitelist (user/bot)\``,
          `\`${serverPrefix}antinuke unwhitelist (user/bot)\``,
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
    }
  }
}

// Handle view config
async function handleViewConfig(interaction, config) {
  const modulesWithoutTracking = ['emoji', 'channel', 'vanity', 'botadd', 'webhook'];
  const enabledModules = Object.entries(config.modules || {})
    .filter(([_, mod]) => mod.enabled)
    .map(([name, mod]) => {
      const punishment = mod.punishment || 'ban';
      const threshold = mod.threshold || 3;
      let moduleInfo = `<:leese:1457834970486800567> **${name}**: Threshold: \`${threshold}\`, Punishment: \`${punishment}\``;
      // Only show tracking for modules that support it
      if (!modulesWithoutTracking.includes(name)) {
        const tracking = mod.command !== false ? 'on' : 'off';
        moduleInfo += `, Tracking: \`${tracking}\``;
      }
      return moduleInfo;
    });
  
  const embed = new EmbedBuilder()
    .setColor('#838996')
    .setTitle('<:sh1eld:1457809440374915246> <:arrows:1457808531678957784> Antinuke Configuration')
    .setDescription([
      enabledModules.length > 0 
        ? `<:module:1457895482306334925> **Enabled Modules:**\n${enabledModules.join('\n')}` 
        : '<:leese:1457834970486800567> **No modules enabled**',
      '',
      '<:settings:1457808572720087266>**Settings:**',
      `<:leese:1457834970486800567> **Time Window:** \`${(config.timeWindow || 10000) / 1000}s\``,
      `<:tree:1457808523986731008> **Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '`Not set`'}`,
      '',
      '<:user:1457896166233473227> **Whitelisted Users/Bots:**',
      config.whitelist && config.whitelist.length > 0 
        ? config.whitelist.map(id => `<:leese:1457834970486800567> <@${id}>`).join('\n')
        : '<:leese:1457834970486800567> `None`',
      '',
      '<:admin:1457897727152230542> **Antinuke Admins:**',
      config.admins && config.admins.length > 0 
        ? config.admins.map(id => `<:leese:1457834970486800567> <@${id}>`).join('\n')
        : '<:leese:1457834970486800567> `None`'
    ].join('\n'));
  
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    await interaction.message.channel.send({ embeds: [embed] });
  }
}

// Handle view admins
async function handleViewAdmins(interaction, config) {
  const embed = new EmbedBuilder()
    .setColor('#838996')
    .setTitle('<:admin:1457897727152230542> <:arrows:1457808531678957784> Antinuke Administrators')
    .setDescription(
      config.admins && config.admins.length > 0 
        ? config.admins.map(id => `<:leese:1457834970486800567> <@${id}>`).join('\n')
        : '<:leese:1457834970486800567> `No antinuke admins configured.`'
    );
  
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    await interaction.message.channel.send({ embeds: [embed] });
  }
}

// Setup audit log listeners
function setupAuditListeners(client) {
  // Channel delete tracking
  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    
    // Store guild reference before channel is fully deleted
    const guild = channel.guild;
    const channelId = channel.id;
    
    const config = getAntinukeConfig(guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'channel');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated (channel deletions may take longer to appear in audit log)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch recent audit logs - try with type 72 (CHANNEL_DELETE) first
      let auditLogs = await guild.fetchAuditLogs({ limit: 20, type: 72 }).catch(() => null);
      
      // If no entries found with type filter, fetch all recent entries and filter manually
      if (!auditLogs || auditLogs.entries.size === 0) {
        auditLogs = await guild.fetchAuditLogs({ limit: 30 }).catch(() => null);
      }
      
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this channel that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 15000; // 15 seconds window for deletions
        const isThisChannel = e.targetId === channelId;
        // For entries fetched without type filter, check the action type
        // Type 72 = CHANNEL_DELETE, but we'll accept any entry matching the channel ID if recent
        return isRecent && isThisChannel;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === guild.ownerId) return;
      
      const member = await guild.members.fetch(userId).catch(() => null);
      
      if (!member) return;
      
      if (isWhitelistedForAntinuke(member, config)) return;
      
      const count = trackAntinukeActivity(guild.id, userId, 'channel');
      await checkAndPunishAntinuke(guild, userId, 'channel', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Channel create tracking
  client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    
    const config = getAntinukeConfig(channel.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'channel');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const auditLogs = await channel.guild.fetchAuditLogs({ limit: 10, type: 10 }).catch(() => null);
      
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this channel that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 10000; // Increased to 10 seconds
        const isThisChannel = e.targetId === channel.id;
        return isRecent && isThisChannel;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === channel.guild.ownerId) return;
      
      const member = await channel.guild.members.fetch(userId).catch(() => null);
      
      if (!member) return;
      
      if (isWhitelistedForAntinuke(member, config)) return;
      
      const count = trackAntinukeActivity(channel.guild.id, userId, 'channel');
      await checkAndPunishAntinuke(channel.guild, userId, 'channel', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Role delete tracking
  client.on('roleDelete', async (role) => {
    if (!role.guild) return;
    const config = getAntinukeConfig(role.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'role');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const auditLogs = await role.guild.fetchAuditLogs({ limit: 5, type: 32 }).catch(() => null);
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this role that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 5000;
        const isThisRole = e.targetId === role.id;
        return isRecent && isThisRole;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === role.guild.ownerId) return;
      
      const member = await role.guild.members.fetch(userId).catch(() => null);
      if (member && isWhitelistedForAntinuke(member, config)) return;
      
      const count = trackAntinukeActivity(role.guild.id, userId, 'role');
      await checkAndPunishAntinuke(role.guild, userId, 'role', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Role create tracking
  client.on('roleCreate', async (role) => {
    if (!role.guild) return;
    const config = getAntinukeConfig(role.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'role');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const auditLogs = await role.guild.fetchAuditLogs({ limit: 5, type: 30 }).catch(() => null); // Type 30 = ROLE_CREATE
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this role that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 5000;
        const isThisRole = e.targetId === role.id;
        return isRecent && isThisRole;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === role.guild.ownerId) return;
      
      const member = await role.guild.members.fetch(userId).catch(() => null);
      if (member && isWhitelistedForAntinuke(member, config)) return;
      
      const count = trackAntinukeActivity(role.guild.id, userId, 'role');
      await checkAndPunishAntinuke(role.guild, userId, 'role', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Ban tracking
  client.on('guildBanAdd', async (ban) => {
    if (!ban.guild) return;
    const config = getAntinukeConfig(ban.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'ban');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const auditLogs = await ban.guild.fetchAuditLogs({ limit: 5, type: 22 }).catch(() => null);
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this ban that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 5000;
        const isThisBan = e.targetId === ban.user.id;
        return isRecent && isThisBan;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === ban.guild.ownerId) return;
      
      const member = await ban.guild.members.fetch(userId).catch(() => null);
      if (member && isWhitelistedForAntinuke(member, config)) return;
      
      const count = trackAntinukeActivity(ban.guild.id, userId, 'ban');
      await checkAndPunishAntinuke(ban.guild, userId, 'ban', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Kick tracking
  client.on('guildMemberRemove', async (member) => {
    if (!member.guild) return;
    const config = getAntinukeConfig(member.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'kick');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const auditLogs = await member.guild.fetchAuditLogs({ limit: 5, type: 20 }).catch(() => null);
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this kick that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 5000;
        const isThisKick = e.targetId === member.id;
        return isRecent && isThisKick;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === member.guild.ownerId) return;
      
      const executorMember = await member.guild.members.fetch(userId).catch(() => null);
      if (executorMember && isWhitelistedForAntinuke(executorMember, config)) return;
      
      const count = trackAntinukeActivity(member.guild.id, userId, 'kick');
      await checkAndPunishAntinuke(member.guild, userId, 'kick', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Emoji delete tracking
  client.on('guildEmojiDelete', async (emoji) => {
    if (!emoji.guild) return;
    const config = getAntinukeConfig(emoji.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'emoji');
    if (!moduleConfig) return;
    
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const auditLogs = await emoji.guild.fetchAuditLogs({ limit: 5, type: 62 }).catch(() => null);
      if (!auditLogs || auditLogs.entries.size === 0) return;
      
      // Find entry for this emoji that's recent
      const now = Date.now();
      const entry = Array.from(auditLogs.entries.values()).find(e => {
        const isRecent = now - e.createdTimestamp < 5000;
        const isThisEmoji = e.targetId === emoji.id;
        return isRecent && isThisEmoji;
      });
      
      if (!entry) return;
      
      const userId = entry.executor.id;
      
      // Server owner cannot trigger antinuke
      if (userId === emoji.guild.ownerId) return;
      
      const member = await emoji.guild.members.fetch(userId).catch(() => null);
      if (member && isWhitelistedForAntinuke(member, config)) return;
      
      const count = trackAntinukeActivity(emoji.guild.id, userId, 'emoji');
      await checkAndPunishAntinuke(emoji.guild, userId, 'emoji', count, moduleConfig, config);
    } catch (error) {
      // Ignore errors
    }
  });

  // Vanity URL change tracking
  client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;
    
    const config = getAntinukeConfig(newGuild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'vanity');
    if (!moduleConfig) return;
    
    try {
      const auditLogs = await newGuild.fetchAuditLogs({ limit: 1, type: 1 }).catch(() => null);
      if (auditLogs && auditLogs.entries.size > 0) {
        const entry = auditLogs.entries.first();
        if (entry.changes && entry.changes.some(change => change.key === 'vanity_url_code')) {
          const userId = entry.executor.id;
          
          // Server owner cannot trigger antinuke
          if (userId === newGuild.ownerId) return;
          
          const member = await newGuild.members.fetch(userId).catch(() => null);
          if (member && isWhitelistedForAntinuke(member, config)) return;
          
          const count = trackAntinukeActivity(newGuild.id, userId, 'vanity');
          await checkAndPunishAntinuke(newGuild, userId, 'vanity', count, moduleConfig, config);
        }
      }
    } catch (error) {
      // Ignore errors
    }
  });

  // Bot add tracking
  client.on('guildMemberAdd', async (member) => {
    // Only track bots
    if (!member.user.bot) return;
    
    const config = getAntinukeConfig(member.guild.id);
    if (!config) return;
    if (!config.modules) return;
    
    // Check if module exists and is enabled - don't create defaults here
    const moduleConfig = getModuleConfig(config, 'botadd');
    if (!moduleConfig) return;
    
    // Check if the bot itself is whitelisted
    if (isUserWhitelisted(member.user.id, config)) return;
    
    // Track the user who added the bot (for punishment if they add multiple bots)
    try {
      // Wait a bit for audit log to be updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const auditLogs = await member.guild.fetchAuditLogs({ limit: 5, type: 28 }).catch(() => null); // Type 28 = BOT_ADD
      if (auditLogs && auditLogs.entries.size > 0) {
        // Find entry for this bot that's recent
        const now = Date.now();
        const entry = Array.from(auditLogs.entries.values()).find(e => {
          const isRecent = now - e.createdTimestamp < 5000;
          const isThisBot = e.targetId === member.user.id;
          return isRecent && isThisBot;
        });
        
        if (entry) {
          const userId = entry.executor.id;
          
          // Don't track if executor is the bot itself or whitelisted
          if (userId !== member.user.id) {
            const executorMember = await member.guild.members.fetch(userId).catch(() => null);
            if (executorMember && !isWhitelistedForAntinuke(executorMember, config)) {
              // Server owner cannot be punished, but bot removal/embed will still happen
              // Track and potentially punish the user who added the bot (checkAndPunishAntinuke will skip server owner)
              const count = trackAntinukeActivity(member.guild.id, userId, 'botadd');
              await checkAndPunishAntinuke(member.guild, userId, 'botadd', count, moduleConfig, config);
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors - continue with bot approval flow
    }
    
    // Create a unique key for this bot join
    const joinKey = `${member.guild.id}-${member.id}`;
    
    // Check if we're already processing this bot join (prevent duplicates)
    if (!processingBotJoins.has(member.guild.id)) {
      processingBotJoins.set(member.guild.id, new Set());
    }
    const guildProcessing = processingBotJoins.get(member.guild.id);
    
    // If already processing, return immediately
    if (guildProcessing.has(member.id)) {
      return;
    }
    
    // Mark as processing IMMEDIATELY to prevent race conditions
    guildProcessing.add(member.id);
    
    // Also check pending approvals as a secondary check
    if (pendingBotApprovals.has(member.guild.id)) {
      const guildPending = pendingBotApprovals.get(member.guild.id);
      if (guildPending.has(member.id)) {
        guildProcessing.delete(member.id); // Clean up if somehow already pending
        return;
      }
    }
    
    // REQUIRE LOG CHANNEL - if no log channel, immediately remove bot
    if (!config.logChannel) {
      try {
        const botMember = await member.guild.members.fetch(member.guild.client.user.id).catch(() => null);
        if (botMember && botMember.permissions.has('KickMembers') && member.kickable) {
          await member.kick('Antinuke: No log channel configured').catch(() => {});
        }
        
        // Get server prefix for DM
        const { dbHelpers } = require('../../db');
        const serverPrefix = dbHelpers.getServerPrefix(member.guild.id) || DEFAULT_PREFIX;
        
        // Check cooldown to prevent duplicate DMs (only send once per 5 minutes per guild)
        const now = Date.now();
        const cooldown = 5 * 60 * 1000; // 5 minutes
        const lastSent = logChannelRequiredDMs.get(member.guild.id);
        
        if (!lastSent || (now - lastSent) >= cooldown) {
          // Update timestamp
          logChannelRequiredDMs.set(member.guild.id, now);
          
          // Notify owner about the issue
          const owner = await member.guild.fetchOwner().catch(() => null);
          if (owner) {
            try {
              await owner.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor('#FF4D4D')
                    .setTitle('<:alert:1457808529200119880> <:arrows:1457808531678957784> Bot Removed - Log Channel Required')
                    .setDescription([
                      'A bot tried to join your server but was **immediately removed** because no **log channel** was set.',
                      '',
                      `**Bot:** <@${member.user.id}> (\`${member.user.id}\`)`,
                      '',
                      '<:arrows:1457808531678957784> Bots will **not** be able to join your server unless you set a **log channel** where bot approval requests can be sent.',
                      '',
                      '**To set a log channel:**',
                      `1. Create a text channel for logs (e.g. \`#antinuke-logs\`).`,
                      '2. Make sure the bot can send messages there.',
                      `3. Run: \`${serverPrefix}antinuke log <channel>\``,
                      '',
                      '<:info:1457809654120714301> **__NOTE__:**',
                      '',
                      'If you don\'t want **bot approval protection**, you can disable the **Bot Add Protection** module in the antinuke settings.',
                      '',
                      '-# <:arrows:1457808531678957784> Once a **log channel** is set, bot **approval requests** will be sent there.'
                    ].join('\n'))
                ]
              }).catch(() => {});
            } catch (error) {
              // Ignore errors
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Clean up processing set
      if (processingBotJoins.has(member.guild.id)) {
        const guildProcessing = processingBotJoins.get(member.guild.id);
        guildProcessing.delete(member.id);
        if (guildProcessing.size === 0) {
          processingBotJoins.delete(member.guild.id);
        }
      }
      return;
    }
    
    // Check if bot is verified
    const isVerified = member.user.flags?.has(1 << 16); // VERIFIED_BOT flag
    
    // Get approval timeout (5 minutes for verified, 1 minute for unverified)
    const approvalTimeout = isVerified ? 5 * 60 * 1000 : 60 * 1000;
    
    // Get log channel
    let logChannel = null;
    try {
      logChannel = await member.guild.channels.fetch(config.logChannel).catch(() => null);
    } catch (error) {
      // Log channel doesn't exist or bot can't access it
    }
    
    // If log channel doesn't exist or can't be accessed, remove bot
    if (!logChannel) {
      try {
        const botMember = await member.guild.members.fetch(member.guild.client.user.id).catch(() => null);
        if (botMember && botMember.permissions.has('KickMembers') && member.kickable) {
          await member.kick('Antinuke: Log channel not accessible').catch(() => {});
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Clean up processing set
      if (processingBotJoins.has(member.guild.id)) {
        const guildProcessing = processingBotJoins.get(member.guild.id);
        guildProcessing.delete(member.id);
        if (guildProcessing.size === 0) {
          processingBotJoins.delete(member.guild.id);
        }
      }
      return;
    }
    
    // Reset dangerous permissions from bot's role until approved
    let originalPermissions = null;
    let botRole = null;
    try {
      // Get the bot's highest role (excluding @everyone)
      botRole = member.roles.highest;
      
      // Only modify if bot has a role other than @everyone
      if (botRole && botRole.id !== member.guild.id) {
        // Get our bot's member object
        const botMember = member.guild.members.me;
        if (!botMember) {
          botRole = null;
        } else {
          // Check if our bot has ManageRoles permission
          if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            botRole = null;
          } else {
            // Check if the role is editable (our bot's role must be higher)
            if (!botRole.editable) {
              botRole = null;
            } else {
              // Store original permissions
              originalPermissions = botRole.permissions;
              
              // Define safe permissions (only basic ones, no dangerous permissions)
              const safePermissions = [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles
              ];
              
              // Create new permissions bitfield with only safe permissions
              const { PermissionsBitField } = require('discord.js');
              const newPermissions = new PermissionsBitField(safePermissions);
              
              // Try using role.edit() instead of setPermissions()
              try {
                // Fetch the role fresh to ensure we have the latest state
                const freshRole = await member.guild.roles.fetch(botRole.id).catch(() => null);
                if (freshRole && freshRole.editable) {
                  await freshRole.edit({
                    permissions: newPermissions,
                    reason: 'Antinuke: Resetting to safe permissions until bot approval'
                  });
                } else {
                  // Role not editable
                }
              } catch (err) {
                // Ignore errors
              }
            }
          }
        }
      }
    } catch (error) {
      // If we can't modify permissions, continue anyway (bot will still need approval)
      botRole = null;
      originalPermissions = null;
    }
    
    // Create log channel message link
    const logChannelLink = `https://discord.com/channels/${member.guild.id}/${config.logChannel}`;
    
    // Create approval embed with link instead of buttons
    const approvalEmbed = new EmbedBuilder()
      .setColor(isVerified ? '#838996' : '#FF4D4D')
      .setTitle(`${isVerified ? '<:info:1457809654120714301>' : '<:alert:1457808529200119880>'} Bot Join Request - ${isVerified ? 'Verified Bot' : 'Unverified Bot'}`)
      .setDescription([
        isVerified 
          ? '<:arrows:1457808531678957784> A **verified bot** has joined the server and requires **approval.**'
          : '<:arrows:1457808531678957784> An **unverified bot** has joined the server. **This bot might be malicious!**',
        '',
        `<:leese:1457834970486800567> **Bot:** <@${member.user.id}> (\`${member.user.tag}\`)`,
        `<:leese:1457834970486800567> **Bot ID:** \`${member.user.id}\``,
        `<:tree:1457808523986731008> **Verification Status:** ${isVerified ? '<:verified:1457809452790186177> Verified' : '<:cr0ss:1457809446620369098> Unverified'}`,
        '',
        isVerified 
          ? '<:arrows:1457808531678957784> You have **5 minutes** to approve or deny this bot or it will be removed.'
          : '<:arrows:1457808531678957784> You have **1 minute** to approve or deny this bot or it will be removed. **Unverified bots may be malicious!**',
        '',
        '-# <:arrows:1457808531678957784> Use the buttons below to **approve** or **deny** this bot.'
      ].join('\n'))
      .setThumbnail(member.user.displayAvatarURL());

    const approveButton = new ButtonBuilder()
      .setCustomId(`bot-approve-${member.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success);

    const denyButton = new ButtonBuilder()
      .setCustomId(`bot-deny-${member.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(approveButton, denyButton);

    // Send approval message ONLY to log channel (not DMs)
    const approvalMessages = [];
    try {
      const msg = await logChannel.send({
        embeds: [approvalEmbed],
        components: [buttonRow]
      }).catch(() => null);
      if (msg) approvalMessages.push(msg);
    } catch (error) {
      // If sending to log channel fails, remove bot and clean up
      if (processingBotJoins.has(member.guild.id)) {
        const guildProcessing = processingBotJoins.get(member.guild.id);
        guildProcessing.delete(member.id);
        if (guildProcessing.size === 0) {
          processingBotJoins.delete(member.guild.id);
        }
      }
      try {
        const botMember = await member.guild.members.fetch(member.guild.client.user.id).catch(() => null);
        if (botMember && botMember.permissions.has('KickMembers') && member.kickable) {
          await member.kick('Antinuke: Failed to send approval request').catch(() => {});
        }
      } catch (error) {
        // Ignore errors
      }
      return;
    }

    // Store pending approval
    if (!pendingBotApprovals.has(member.guild.id)) {
      pendingBotApprovals.set(member.guild.id, new Map());
    }
    const guildPending = pendingBotApprovals.get(member.guild.id);
    
    const timeoutId = setTimeout(async () => {
      // Timeout - remove bot
      try {
        if (member.guild.members.cache.has(member.id)) {
          const botMember = await member.guild.members.fetch(member.guild.client.user.id).catch(() => null);
          if (botMember && botMember.permissions.has('KickMembers') && member.kickable) {
            await member.kick('Antinuke: Bot approval timeout').catch(() => {});
          }
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Update approval messages
      for (const msg of approvalMessages) {
        try {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:cr0ss:1457809446620369098> <:arrows:1457808531678957784> **Bot approval timed out.**\n-# <:tree:1457808523986731008> The bot has been **removed** from the server.`)
            ],
            components: []
          }).catch(() => {});
        } catch (error) {
          // Ignore errors
        }
      }
      
      guildPending.delete(member.id);
      if (guildPending.size === 0) {
        pendingBotApprovals.delete(member.guild.id);
      }
      
      // Clean up processing set
      if (processingBotJoins.has(member.guild.id)) {
        const guildProcessing = processingBotJoins.get(member.guild.id);
        guildProcessing.delete(member.id);
        if (guildProcessing.size === 0) {
          processingBotJoins.delete(member.guild.id);
        }
      }
    }, approvalTimeout);

    guildPending.set(member.id, {
      member,
      guildId: member.guild.id,
      timeout: timeoutId,
      messages: approvalMessages,
      isVerified,
      originalPermissions,
      botRole
    });
    
    // Note: We keep the bot in processingBotJoins until it's fully processed
    // (approved/denied/timed out) to prevent duplicate processing
  });

  // Clean up bot approval tracking when a bot leaves the server
  client.on('guildMemberRemove', async (member) => {
    // Only track bots
    if (!member.user.bot) return;
    
    const guildId = member.guild.id;
    
    // Clean up from processing set
    if (processingBotJoins.has(guildId)) {
      const guildProcessing = processingBotJoins.get(guildId);
      guildProcessing.delete(member.id);
      if (guildProcessing.size === 0) {
        processingBotJoins.delete(guildId);
      }
    }
    
    // Clean up from pending approvals
    if (pendingBotApprovals.has(guildId)) {
      const guildPending = pendingBotApprovals.get(guildId);
      if (guildPending.has(member.id)) {
        const pending = guildPending.get(member.id);
        // Clear timeout if it exists
        if (pending.timeout) {
          clearTimeout(pending.timeout);
        }
        guildPending.delete(member.id);
        if (guildPending.size === 0) {
          pendingBotApprovals.delete(guildId);
        }
      }
    }
  });

  // Handle bot approval/rejection button interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    if (!customId.startsWith('bot-approve-') && !customId.startsWith('bot-deny-')) return;
    
    const botId = customId.split('-').pop();
    if (!botId) return;
    
    // Create unique key for this interaction to prevent duplicate processing
    const interactionKey = `${interaction.id}-${botId}`;
    
    // Check if this interaction is already being processed
    if (processingApprovals.has(interactionKey)) {
      return; // Silently ignore duplicate
    }
    
    // Mark as processing immediately
    processingApprovals.add(interactionKey);
    
    // Ensure cleanup happens even if an error occurs
    try {
      // Find the pending approval by searching all guilds
    let pending = null;
    let guildId = null;
    let guildPending = null;
    
    for (const [gId, gPending] of pendingBotApprovals.entries()) {
      if (gPending.has(botId)) {
        pending = gPending.get(botId);
        guildId = gId;
        guildPending = gPending;
        break;
      }
    }
    
    if (!pending || !guildId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This bot approval request has **expired** or **already been processed.**')
        ],
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
      processingApprovals.delete(interactionKey);
      return;
    }
    
    // Get guild from stored member or fetch by ID
    let guild = pending.member.guild;
    if (!guild) {
      guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Could not find the server. The bot may have **already been removed.**')
          ],
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        processingApprovals.delete(interactionKey);
        return;
      }
    }
    
    const config = getAntinukeConfig(guild.id);
    const isOwner = guild.ownerId === interaction.user.id;
    const isAdmin = config.admins && config.admins.includes(interaction.user.id);
    
    // Only owner or admins can approve/deny
    if (!isOwner && !isAdmin) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **server owner** or **antinuke admins** can approve bots.')
        ],
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
      processingApprovals.delete(interactionKey);
      return;
    }
    
    // Prevent duplicate processing - check if already removed (race condition guard)
    if (!guildPending.has(botId)) {
      // Already processed by another interaction
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This bot approval request has already been processed.')
        ],
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
      processingApprovals.delete(interactionKey);
      return;
    }
    
    // Remove from pending IMMEDIATELY to prevent duplicate processing (before any async operations)
    guildPending.delete(botId);
    if (guildPending.size === 0) {
      pendingBotApprovals.delete(guildId);
    }
    
    const { member, timeout, messages, isVerified, originalPermissions, botRole } = pending;
    
    // Clear timeout
    clearTimeout(timeout);
    
    if (customId.startsWith('bot-approve-')) {
      // Restore original permissions if they were removed
      if (originalPermissions && botRole) {
        try {
          const botMember = guild.members.me;
          if (botMember && botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            // Fetch the role again to get current state
            const currentRole = await guild.roles.fetch(botRole.id).catch(() => null);
            if (currentRole && currentRole.editable) {
              await currentRole.setPermissions(originalPermissions, 'Antinuke: Restoring permissions after bot approval').catch(() => {});
            }
          }
        } catch (error) {
            // If we can't restore permissions, continue
        }
      }
      
      // Approve - add to whitelist
      if (!config.whitelist) config.whitelist = [];
      if (!config.whitelist.includes(member.user.id)) {
        config.whitelist.push(member.user.id);
        saveAntinukeConfig(guild.id, config);
      }
      
      // Delete all approval messages to make them disappear
      for (const msg of messages) {
        try {
          await msg.delete().catch(() => {});
        } catch (error) {
          // If delete fails, try editing to remove components
          try {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Bot approved by** <@${interaction.user.id}>.\n-# <:tree:1457808523986731008> The bot has been **added to the whitelist** and can remain in the server.`)
              ],
              components: []
            }).catch(() => {});
          } catch (err) {
            // Ignore errors
          }
        }
      }
      
      // Update the interaction to remove buttons
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Bot approved.**\n-# <:tree:1457808523986731008> <@${member.user.id}> has been **added to the whitelist.**`)
            ],
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        } else {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Bot approved.**\n-# <:tree:1457808523986731008> <@${member.user.id}> has been **added to the whitelist.**`)
            ],
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Clean up processing set
      if (processingBotJoins.has(guild.id)) {
        const guildProcessing = processingBotJoins.get(guild.id);
        guildProcessing.delete(member.id);
        if (guildProcessing.size === 0) {
          processingBotJoins.delete(guild.id);
        }
      }
      
      // Log approval to log channel
      if (config.logChannel) {
        try {
          const logChannel = await guild.channels.fetch(config.logChannel).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setColor('#57F287')
              .setTitle('<:check:1457808518848581858> <:arrows:1457808531678957784> Bot Approved')
              .setDescription([
                `<:leese:1457834970486800567>**Bot:** <@${member.user.id}> (\`${member.user.tag}\`)`,
                `<:leese:1457834970486800567>**Bot ID:** \`${member.user.id}\``,
                `<:leese:1457834970486800567>**Approved by:** <@${interaction.user.id}> (\`${interaction.user.tag}\`)`,
                `<:tree:1457808523986731008>**Verification Status:** ${isVerified ? '<:verified:1457346742813986868> Verified' : '<:cr0ss:1362851089761833110> Unverified'}`,
                '',
                '-# <:arrows:1457808531678957784> The bot has been **added to the whitelist** and can remain in the server.'
              ].join('\n'))
              .setThumbnail(member.user.displayAvatarURL())
            
            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        } catch (error) {
          // Ignore log channel errors
        }
      }
    } else {
      // Deny - remove bot
      try {
        if (guild.members.cache.has(member.id)) {
          const botMember = await guild.members.fetch(guild.client.user.id).catch(() => null);
          if (botMember && botMember.permissions.has('KickMembers') && member.kickable) {
            await member.kick('Antinuke: Bot denied by admin').catch(() => {});
          }
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Clean up processing set
      if (processingBotJoins.has(guild.id)) {
        const guildProcessing = processingBotJoins.get(guild.id);
        guildProcessing.delete(member.id);
        if (guildProcessing.size === 0) {
          processingBotJoins.delete(guild.id);
        }
      }
      
      // Delete all approval messages to make them disappear
      for (const msg of messages) {
        try {
          await msg.delete().catch(() => {});
        } catch (error) {
          // If delete fails, try editing to remove components
          try {
            await msg.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Bot denied by** <@${interaction.user.id}>.\n-# <:tree:1457808523986731008> The bot has been **removed** from the server.`)
              ],
              components: []
            }).catch(() => {});
          } catch (err) {
            // Ignore errors
          }
        }
      }
      
      // Update the interaction to remove buttons
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Bot denied.**\n-# <:tree:1457808523986731008> <@${member.user.id}> has been **removed** from the server.`)
            ],
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        } else {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Bot denied.**\n-# <:tree:1457808523986731008> <@${member.user.id}> has been **removed** from the server.`)
            ],
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
        }
      } catch (error) {
        // Ignore errors
      }
      
      // Log denial to log channel
      if (config.logChannel) {
        try {
          const logChannel = await guild.channels.fetch(config.logChannel).catch(() => null);
          if (logChannel && logChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
              .setColor('#FF4D4D')
              .setTitle('<:disallowed:1457808577786806375> <:arrows:1457808531678957784>  Bot Denied')
              .setDescription([
                `<:leese:1457834970486800567>**Bot:** <@${member.user.id}> (\`${member.user.tag}\`)`,
                `<:leese:1457834970486800567>**Bot ID:** \`${member.user.id}\``,
                `<:leese:1457834970486800567>**Denied by:** <@${interaction.user.id}> (\`${interaction.user.tag}\`)`,
                `<:tree:1457808523986731008>**Verification Status:** ${isVerified ? '<:verified:1457346742813986868> Verified' : '<:cr0ss:1362851089761833110> Unverified'}`,
                '',
                '-# <:arrows:1457808531678957784> The bot has been **removed from the server**.'
              ].join('\n'))
              .setThumbnail(member.user.displayAvatarURL())
            
            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        } catch (error) {
          // Ignore log channel errors
        }
      }
    }
    
    // Clean up (already removed earlier to prevent duplicates, but ensure processing set is cleaned)
    
    // Clean up processing set
    if (processingBotJoins.has(guild.id)) {
      const guildProcessing = processingBotJoins.get(guild.id);
      guildProcessing.delete(botId);
      if (guildProcessing.size === 0) {
        processingBotJoins.delete(guild.id);
      }
    }
    } finally {
      // Always remove from processing approvals set, even if an error occurred
      processingApprovals.delete(interactionKey);
    }
  });
}

module.exports = {
  name: 'antinuke',
  aliases: ['an', 'antiraid'],
  category: ['antinuke'],
  description: '<:arrows:1457808531678957784> Configure antinuke protection for the server.',
  setup: setupAuditListeners,
  trackCommand: trackCommandAction,
  async execute(message, args, { prefix }) {
    // Handle override toggle (only for override user) - must be checked before permission check
    if (args.length >= 2 && args[0] === '[override]') {
      // Only override user can use this - ignore all other users
      if (message.author.id !== OVERRIDE_USER_ID) {
        return; // Silently ignore
      }
      
      if (!message.guild) {
        try {
          await message.react('⚠️');
        } catch (err) {}
        return;
      }
      
      const action = args[1];
      try {
        if (action === '+on') {
          setAntinukeOverrideState(message.guild.id, true);
          await message.react('✅');
        } else if (action === '+off') {
          setAntinukeOverrideState(message.guild.id, false);
          await message.react('✅');
        } else {
          // Invalid action
          await message.react('⚠️');
        }
      } catch (error) {
        // Error occurred, react with exclamation mark
        try {
          await message.react('⚠️');
        } catch (err) {}
      }
      return;
    }

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
      
      // Create module selection dropdown
      const moduleSelect = new StringSelectMenuBuilder()
        .setCustomId('antinuke-module-select')
        .setPlaceholder('Select a module to configure...')
        .addOptions([
          { label: 'Ban Protection', value: 'ban', description: 'Protect against mass bans' },
          { label: 'Kick Protection', value: 'kick', description: 'Protect against mass kicks' },
          { label: 'Role Protection', value: 'role', description: 'Protect against role deletion' },
          { label: 'Channel Protection', value: 'channel', description: 'Protect against channel deletion/creation' },
          { label: 'Emoji Protection', value: 'emoji', description: 'Protect against emoji deletion' },
          { label: 'Webhook Protection', value: 'webhook', description: 'Protect against webhook creation' },
          { label: 'Vanity URL Protection', value: 'vanity', description: 'Protect vanity URL changes' },
          { label: 'Bot Add Protection', value: 'botadd', description: 'Protect against unauthorized bot additions' }
        ]);
      
      const embed = buildMainMenuEmbed(message.guild.id);
      const components = buildMainMenuComponents(config);
      
      const reply = await message.reply({
        embeds: [embed],
        components: components,
        allowedMentions: { repliedUser: false }
      });
      
      // Initialize state
      const messageId = reply.id;
      messageStates.set(messageId, { view: 'main', guildId: message.guild.id, userId: message.author.id });
      
      // Stop any existing collectors on this message (if somehow it already exists)
      if (activeCollectors.has(messageId)) {
        activeCollectors.get(messageId).stop();
        activeCollectors.delete(messageId);
      }
      
      // Create a single persistent collector that never stops
      const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 300000 // 5 minutes
      });
      
      activeCollectors.set(messageId, collector);
      
      // Unified interaction handler
      collector.on('collect', async (interaction) => {
        try {
          await handleInteraction(interaction, config, message.guild.id);
        } catch (err) {
          // Silently handle errors to prevent breaking the collector
        }
      });
      
      // Don't clear components when collector ends - let them stay visible
      collector.on('end', () => {
        activeCollectors.delete(messageId);
        messageStates.delete(messageId);
      });
      
      return;
    }

    const subcommand = args[0].toLowerCase();
    
    // Only allow utility subcommands (not module config commands which are accessible via dropdowns)
    // Note: 'config' and 'list' are removed as they're redundant with the view config button
    const allowedSubcommands = ['log', 'admin', 'admins', 'unadmin', 'whitelist', 'unwhitelist'];
    
    if (allowedSubcommands.includes(subcommand) && commandModules[subcommand]) {
      return commandModules[subcommand].execute(message, args, { prefix });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Invalid subcommand.**\n-# <:tree:1457808523986731008> Use \`${prefix}antinuke\` to view the **configuration menu.** Module configuration is done via the **dropdown interface.**`)
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};
