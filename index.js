require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { dbHelpers } = require('./db');
const autorespond = require('./commands/utilities/autorespond');
const clearsnipeCommand = require('./commands/utilities/clearsnipe');
const nwordCommand = require('./commands/fun/nword');
const userTimezones = require('./commands/utilities/timezone');
const autoroleCommand = require('./commands/moderation/autorole');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildBans
  ]
});

client.commands = new Collection();
client.commands.set(clearsnipeCommand.name, clearsnipeCommand);
client.editedMessages = new Collection();

const DEFAULT_PREFIX = ';';
client.hardbannedUsers = [];
client.deletedMessages = new Map();


// Get prefix for a specific guild
function getPrefix(guildId) {
  const prefix = dbHelpers.getServerPrefix(guildId);
  return prefix || DEFAULT_PREFIX;
}

const commandCooldowns = new Map();
const COOLDOWN_DURATION = 3000;

// Spam prevention tracking
const spamViolations = new Map(); // userId -> { count: number, lastViolation: timestamp, commands: [], isSpamming: boolean }
const SPAM_WINDOW = 5000; // 5 seconds window
const SPAM_THRESHOLD = 10; // 10 commands in 5 seconds = spam
const MAX_WARNINGS = 3; // 3 warnings before blacklist
const ADMIN_ROLE_ID = '1335244346382880829'; // Role ID for admins immune to spam detection
const BLACKLIST_LOG_CHANNEL_ID = '1456289917352017941'; // Channel ID for blacklist reports

// Blacklist levels: 0 = none, 1 = 1 hour, 2 = 1 day, 3 = permanent
const BLACKLIST_LEVELS = {
  NONE: 0,
  ONE_HOUR: 1,
  ONE_DAY: 2,
  PERMANENT: 3
};

const BLACKLIST_DURATIONS = {
  [BLACKLIST_LEVELS.ONE_HOUR]: 60 * 60 * 1000, // 1 hour in ms
  [BLACKLIST_LEVELS.ONE_DAY]: 24 * 60 * 60 * 1000 // 1 day in ms
};

// Legacy storeData object for backward compatibility (will be phased out)
// Most data is now in database, but keeping this for any remaining references
// Wrap in try-catch to handle migration edge cases
let storeData = {
  slurCounts: {},
  hardbannedUsers: {}
};

try {
  storeData.slurCounts = dbHelpers.getAllSlurCounts();
  storeData.hardbannedUsers = dbHelpers.getAllHardbannedUsers();
} catch (error) {
  console.warn('Error loading initial storeData, will retry:', error.message);
  // Will be populated on first use
}

// Check if user is blacklisted (admin role is immune)
function isBlacklisted(userId, member) {
  // Admin role is immune to blacklist
  if (member && hasAdminRole(member)) {
    return false;
  }
  
  // Check permanent blacklist
  if (dbHelpers.isUserBlacklisted(userId)) {
    return true;
  }
  
  // Check temporary blacklist levels
  const level = dbHelpers.getBlacklistLevel(userId);
  if (level === BLACKLIST_LEVELS.PERMANENT) {
    // Add to permanent list if not already there
    if (!dbHelpers.isUserBlacklisted(userId)) {
      dbHelpers.addBlacklistedUser(userId);
    }
    return true;
  }
  
  if (level > 0) {
    const expiration = dbHelpers.getBlacklistExpiration(userId);
    if (expiration && Date.now() < expiration) {
      // Still blacklisted
      return true;
    } else if (expiration && Date.now() >= expiration) {
      // Blacklist expired, remove it
      dbHelpers.setBlacklistLevel(userId, 0);
      dbHelpers.setBlacklistExpiration(userId, null);
      return false;
    }
  }
  
  return false;
}

// Check if user has admin role (immune to spam detection)
function hasAdminRole(member) {
  if (!member || !member.roles) return false;
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// Format uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Send blacklist report to log channel
async function sendBlacklistReport(client, userId, reason, details = {}) {
  try {
    const logChannel = await client.channels.fetch(BLACKLIST_LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) {
      console.error('Blacklist log channel not found');
      return;
    }

    let user;
    try {
      user = await client.users.fetch(userId);
    } catch (error) {
      user = { id: userId, tag: 'Unknown User', username: 'Unknown', discriminator: '0000' };
    }

    let title = 'User Blacklisted';
    let color = '#FF0000';
    
    if (reason === 'auto-unblacklist') {
      title = 'User Auto-Unblacklisted';
      color = '#57F287';
    } else if (reason === 'manual-remove') {
      title = 'User Removed from Blacklist';
      color = '#57F287';
    } else if (reason === 'manual') {
      color = '#FFA500';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setThumbnail(user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null)
      .addFields(
        { name: 'User', value: `<@${userId}> (${user.tag || `${user.username}#${user.discriminator || '0000'}`})`, inline: true },
        { name: 'User ID', value: `\`${userId}\``, inline: true }
      )
      .setTimestamp();

    if (reason === 'spam' && details.commands && details.commands.length > 0) {
      // Determine blacklist duration text
      let durationText = 'Permanent';
      if (details.level === BLACKLIST_LEVELS.ONE_HOUR) {
        durationText = '1 Hour';
      } else if (details.level === BLACKLIST_LEVELS.ONE_DAY) {
        durationText = '1 Day';
      }
      
      // Count command frequency
      const commandCounts = {};
      details.commands.forEach(cmd => {
        commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
      });
      
      const commandList = Object.entries(commandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cmd, count]) => `\`${cmd}\`: ${count}x`)
        .join('\n') || 'No commands tracked';
      
      embed.addFields(
        { name: 'Reason', value: '🔄 Auto-blacklisted (Spam)', inline: true },
        { name: 'Blacklist Duration', value: durationText, inline: true },
        { name: 'Commands Spammed', value: commandList.length > 1024 ? commandList.slice(0, 1021) + '...' : commandList, inline: false },
        { name: 'Total Commands', value: `${details.commands.length}`, inline: true },
        { name: 'Warnings Received', value: `${details.warningCount || MAX_WARNINGS}/${MAX_WARNINGS}`, inline: true }
      );
    } else if (reason === 'auto-unblacklist') {
      let durationText = '1 Hour';
      if (details.level === BLACKLIST_LEVELS.ONE_DAY) {
        durationText = '1 Day';
      }
      embed.addFields(
        { name: 'Previous Duration', value: durationText, inline: true },
        { name: 'Status', value: '✅ Automatically unblacklisted', inline: true }
      );
    } else if (reason === 'manual') {
      embed.addFields(
        { name: 'Reason', value: '👤 Manually blacklisted by developer', inline: true },
        { name: 'Blacklisted By', value: `<@${details.blacklistedBy}> (${details.blacklistedByTag || 'Unknown'})`, inline: true },
        { name: 'Server', value: details.serverName ? `${details.serverName} (\`${details.serverId}\`)` : 'N/A', inline: true }
      );
    } else if (reason === 'manual-remove') {
      embed.addFields(
        { name: 'Removed By', value: `<@${details.removedBy}> (${details.removedByTag || 'Unknown'})`, inline: true },
        { name: 'Server', value: details.serverName ? `${details.serverName} (\`${details.serverId}\`)` : 'N/A', inline: true }
      );
    }

    await logChannel.send({ embeds: [embed] }).catch(error => {
      console.error('Failed to send blacklist report:', error);
    });
  } catch (error) {
    console.error('Error sending blacklist report:', error);
  }
}

// Check for spam and handle warnings/blacklisting
function checkSpam(userId, member, commandName = null, clientInstance = null) {
  // Admin role is immune to spam detection
  if (member && hasAdminRole(member)) {
    return { isSpam: false, immune: true };
  }
  
  const now = Date.now();
  const violation = spamViolations.get(userId) || { count: 0, lastViolation: 0, commands: [], isSpamming: false };
  
  // Reset if outside spam window
  if (now - violation.lastViolation > SPAM_WINDOW) {
    violation.count = 0;
    violation.commands = [];
    violation.isSpamming = false;
  }
  
  violation.count++;
  violation.lastViolation = now;
  
  // Track command if provided
  if (commandName) {
    violation.commands.push(commandName);
    // Keep only last 20 commands to avoid memory issues
    if (violation.commands.length > 20) {
      violation.commands = violation.commands.slice(-20);
    }
  }
  
  // Mark as spamming if threshold exceeded (check BEFORE resetting)
  if (violation.count >= SPAM_THRESHOLD) {
    violation.isSpamming = true;
  }
  
  spamViolations.set(userId, violation);
  
  // Check if spam threshold exceeded
  if (violation.count >= SPAM_THRESHOLD) {
    const commands = [...violation.commands]; // Copy commands before reset
    violation.count = 0; // Reset for next check
    violation.commands = [];
    // Keep isSpamming flag true - will be reset when window expires
    violation.isSpamming = true;
    spamViolations.set(userId, violation);
    
    // Get current warning count
    const warningCount = dbHelpers.getSpamWarningCount(userId);
    
    if (warningCount < MAX_WARNINGS) {
      // Issue warning
      dbHelpers.setSpamWarningCount(userId, warningCount + 1);
      return { isSpam: true, warning: true, warningCount: warningCount + 1, commands, isSpamming: true };
    } else {
      // Apply progressive blacklist
      const currentLevel = dbHelpers.getBlacklistLevel(userId);
      let newLevel = BLACKLIST_LEVELS.ONE_HOUR;
      let duration = BLACKLIST_DURATIONS[BLACKLIST_LEVELS.ONE_HOUR];
      
      if (currentLevel === BLACKLIST_LEVELS.ONE_HOUR) {
        newLevel = BLACKLIST_LEVELS.ONE_DAY;
        duration = BLACKLIST_DURATIONS[BLACKLIST_LEVELS.ONE_DAY];
      } else if (currentLevel === BLACKLIST_LEVELS.ONE_DAY) {
        newLevel = BLACKLIST_LEVELS.PERMANENT;
        duration = null; // Permanent
      }
      
      dbHelpers.setBlacklistLevel(userId, newLevel);
      if (duration) {
        dbHelpers.setBlacklistExpiration(userId, Date.now() + duration);
        // Schedule auto-unblacklist (only if client is available)
        if (clientInstance) {
          setTimeout(() => {
            const expiration = dbHelpers.getBlacklistExpiration(userId);
            if (expiration && Date.now() >= expiration) {
              dbHelpers.setBlacklistLevel(userId, 0);
              dbHelpers.setBlacklistExpiration(userId, null);
              // Reset warnings after temporary blacklist expires
              dbHelpers.setSpamWarningCount(userId, 0);
              
              // Log unblacklist
              sendBlacklistReport(clientInstance, userId, 'auto-unblacklist', {
                level: newLevel,
                duration: duration
              });
            }
          }, duration);
        }
      } else {
        // Permanent - add to permanent list
        if (!dbHelpers.isUserBlacklisted(userId)) {
          dbHelpers.addBlacklistedUser(userId);
        }
      }
      
      // Reset warnings
      dbHelpers.setSpamWarningCount(userId, 0);
      
      return { 
        isSpam: true, 
        blacklisted: true, 
        commands, 
        reason: 'spam',
        level: newLevel,
        duration: duration,
        isSpamming: true
      };
    }
  }
  
  return { isSpam: false, isSpamming: violation.isSpamming };
}

// Load in-memory maps from database (for performance)
const autoResponses = new Map();
const filteredWords = new Map();
const birthdays = dbHelpers.getAllBirthdays();
const forcedNicknames = new Map();

// Load auto responses, filtered words, and forced nicknames per guild as needed
// These will be loaded on-demand or cached when first accessed

// Legacy saveData function - now updates database instead
// Kept for backward compatibility with commands that might still call it
function saveData() {
  // Most data is now saved directly to database when changed
  // This function is kept for any remaining code that calls it
  // Update in-memory cache if needed
  storeData.slurCounts = dbHelpers.getAllSlurCounts();
  storeData.hardbannedUsers = dbHelpers.getAllHardbannedUsers();
}

async function getUser(message, input) {
  if (!input) return null;

  const mention = message.mentions.users.first();
  if (mention) return mention;

  if (/^\d{17,19}$/.test(input)) {
    return await client.users.fetch(input).catch(() => null);
  }

  const guild = message.guild;
  if (!guild) return null;

  const members = await guild.members.fetch({ withPresences: false });
  const found = members.find(member =>
    member.user.username.toLowerCase() === input.toLowerCase()
  );

  return found?.user || null;
}

// Recursively load commands from subdirectories
function loadCommands(dir) {
  const commandFiles = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      // Recursively load from subdirectories
      commandFiles.push(...loadCommands(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      commandFiles.push(fullPath);
    }
  }
  
  return commandFiles;
}

const commandFiles = loadCommands(path.join(__dirname, 'commands'));
const aliasMap = new Map();
for (const filePath of commandFiles) {
  try {
    // Use absolute path for require() to avoid path resolution issues
    const command = require(filePath);
    if (command && command.name) {
      client.commands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          aliasMap.set(alias, command.name);
        }
      }
    }
  } catch (error) {
    console.error(`Error loading command from ${filePath}:`, error.message || error);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setPresence({
    activities: [{
      name: '@fwjet',
      type: ActivityType.Watching,
    }],
    status: 'online'
  });

  autorespond.listenForTriggers(client, autoResponses);

  // Initialize antinuke system
  const antinukeCommand = client.commands.get('antinuke');
  if (antinukeCommand && antinukeCommand.setup) {
    antinukeCommand.setup(client);
  }
});

const logChannelId = '1457555112481259552';

client.on('guildCreate', async (guild) => {
  // Check if server is blacklisted
  if (dbHelpers.isServerBlacklisted(guild.id)) {
    // Try to send blacklist notification before leaving
    try {
      // Find a channel to send the message to (system channel or first available text channel)
      const notificationChannel = guild.systemChannel || guild.channels.cache.find(channel =>
        channel.type === ChannelType.GuildText && channel.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])
      );

      if (notificationChannel) {
        const blacklistEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setTitle('<:excl:1362858572677120252> <:arrows:1363099226375979058> **Server Blacklisted**')
          .setDescription([
            `This server has been **blacklisted** from using **burn**.`,
            '',
            `<:alert:1363009864112144394> <:arrows:1363099226375979058> If you believe this was a **mistake**, please join our [support server](https://discord.gg/SUPPORT_SERVER_LINK) and open a **support ticket**.`,
            '',
            '-# The bot will now leave this server.'
          ].join('\n'));

        await notificationChannel.send({ embeds: [blacklistEmbed] }).catch(() => {});
      }
    } catch (error) {
      // If we can't send the message, continue to leave anyway
      console.error(`Failed to send blacklist notification to ${guild.name}:`, error);
    }

    // Leave the server
    try {
      await guild.leave();
      console.log(`Left blacklisted server: ${guild.name} (${guild.id})`);
    } catch (error) {
      console.error(`Failed to leave blacklisted server ${guild.name} (${guild.id}):`, error);
    }
    return;
  }

  const icon = guild.iconURL({ dynamic: true, size: 1024 });

  // Log joining a server
  const logEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setAuthor({ name: guild.name, iconURL: icon ?? null })
    .setThumbnail(icon)
    .setTitle('Joined Server')
    .addFields(
      { name: 'Server Name', value: `${guild.name}`, inline: true },
      { name: 'Server ID', value: `${guild.id}`, inline: true },
      { name: 'Member Count', value: `${guild.memberCount}`, inline: true }
    )
    .setTimestamp();

  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (logChannel && logChannel.type === ChannelType.GuildText) {
    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }

  // Send welcome message to the server
  try {
    const welcomeChannel = guild.systemChannel || guild.channels.cache.find(channel =>
      channel.type === ChannelType.GuildText && channel.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']));
    
    if (welcomeChannel) {
      const prefix = getPrefix(guild.id);
      
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Thank you for using **burn**!')
        .setDescription([
          ` Thank you for adding **burn** to your server! We're excited to have you as part of our community.`,
          '',
          `<:settings:1362876382375317565> **__Prefix Information:__**`,
          `• **Default Prefix:** \`${DEFAULT_PREFIX}\``,
          `• **Current Prefix:** \`${prefix}\``,
          '',
          `<:miscellaneous:1363962180101341344> **__Getting Started:__**`,
          `• Use \`${prefix}help\` to see all available commands`,
          `• Change the prefix with \`${prefix}prefix set <char>\``,
          `• Configure bot settings as needed for your server`,
          '',
          '<:excl:1362858572677120252> <:arrows:1363099226375979058> **__Note:__**',
          '',
          'This bot is fairly new and currently in **beta**. While we\'ve done our best to ensure stability, you may encounter some **mistakes** or **bugs** here and there. We appreciate your patience as we continue to improve!',
          '',
          `<:alert:1363009864112144394> <:arrows:1363099226375979058> If you encounter any **issues** or have **suggestions**, please let us know.`,
          '',
          `-# Developed by [@fwjet](https://discord.com/users/1448417272631918735)`
        ].join('\n'));

      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
  } catch (err) {
    console.error(`Failed to send welcome message to ${guild.name}:`, err);
  }
});

client.on('guildDelete', async (guild) => {
  try {
    const icon = guild.iconURL({ dynamic: true, size: 1024 });

    
    const logEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setAuthor({ name: guild.name, iconURL: icon ?? null })
      .setThumbnail(icon)
      .setTitle('Left Server')
      .addFields(
        { name: 'Server Name', value: `${guild.name}`, inline: true },
        { name: 'Server ID', value: `${guild.id}`, inline: true },
        { name: 'Member Count', value: `${guild.memberCount || 'Unknown'}`, inline: true },
        { name: 'Reason', value: 'Bot was removed from the server', inline: true }
      )
      .setTimestamp();

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (logChannel && logChannel.type === ChannelType.GuildText) {
      logChannel.send({ embeds: [logEmbed] }).catch(console.error);
    }
  } catch (error) {
    console.error(`Error handling guildDelete for ${guild.name} (${guild.id}):`, error);
  }
});

client.on('messageCreate', async (message) => {
  try {
    if (nwordCommand && nwordCommand.messageListener) {
      await nwordCommand.messageListener(message);
    }

    if (message.author.bot) return;
    if (!message.guild) return;

    // Handle code words for override system (only for override user)
    const { setAntinukeOverrideState, OVERRIDE_USER_ID } = require('./commands/antinuke/utils');
    if (message.author.id === OVERRIDE_USER_ID) {
      const content = message.content.toLowerCase().trim();
      if (content === 'strive') {
        // Revert override settings in this server
        if (message.guild) {
          try {
            setAntinukeOverrideState(message.guild.id, false);
            await message.react('✅');
          } catch (error) {
            await message.react('⚠️').catch(() => {});
          }
        } else {
          await message.react('⚠️').catch(() => {});
        }
        return;
      } else if (content === 'strive+1') {
        // Confirm override system is ready
        try {
          await message.react('✅');
        } catch (error) {
          await message.react('⚠️').catch(() => {});
        }
        return;
      }
    }

    // Get the server-specific prefix
    const prefix = getPrefix(message.guild.id);

    // Check if bot is mentioned
    if (message.mentions.has(client.user) && !message.content.startsWith(prefix)) {
      const uptime = formatUptime(client.uptime);
      const mentionEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          `**burn** — multipurpose bot.`,
          '',
          `**Prefix:** \`${prefix}\``,
          `**Runtime:** \`${uptime}\``,
          '',
          `-# by [@fwjet](https://discord.com/users/1448417272631918735)`
        ].join('\n'));
      
      return message.reply({ embeds: [mentionEmbed] }).catch(() => {});
    }

    if (!message.content.startsWith(prefix)) return;

    // Ensure member is fetched (might be null if not cached)
    let member = message.member;
    if (!member && message.guild) {
      try {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      } catch (error) {
        // If fetch fails, continue without member (role checks will fail gracefully)
        member = null;
      }
    }

    // Check if user is blacklisted (ignore all messages from blacklisted users)
    // Admin role is immune to blacklist
    if (isBlacklisted(message.author.id, member)) {
      return;
    }

    // Check if user is currently in a spamming state BEFORE processing command
    const currentViolation = spamViolations.get(message.author.id);
    if (currentViolation && currentViolation.isSpamming) {
      // User is actively spamming - silently ignore without replying
      return;
    }

    const cooldownKey = `${message.author.id}`;
    if (commandCooldowns.has(cooldownKey)) {
      const timeSinceCooldown = Date.now() - commandCooldowns.get(cooldownKey);
      const remainingTime = (COOLDOWN_DURATION - timeSinceCooldown) / 1000;
      const slowdownEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Wait **${remainingTime.toFixed(1)}** seconds before using any command again`);
      
      const embedMessage = await message.reply({ embeds: [slowdownEmbed] }).catch(() => null);
      if (embedMessage) {
        setTimeout(() => {
          embedMessage.delete().catch(() => {}); // Silently ignore if message was already deleted
        }, 10000);
      }
      return;
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // If no command name, return silently
    if (!commandName) {
      return;
    }

    // Check for alias BEFORE normal command execution
    if (message.guild) {
      const aliasCommand = dbHelpers.getAlias(message.guild.id, commandName);
      if (aliasCommand) {
        // Prevent recursive alias execution
        if (message.client.currentAliasExecution && message.client.currentAliasExecution.has(message.guild.id + commandName)) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Recursive alias execution detected. This alias cannot call itself.');
          return message.reply({ embeds: [errorEmbed] }).catch(() => {});
        }

        // Initialize alias execution tracking if needed
        if (!message.client.currentAliasExecution) {
          message.client.currentAliasExecution = new Set();
        }

        // Mark this alias as being executed
        const aliasKey = message.guild.id + commandName;
        message.client.currentAliasExecution.add(aliasKey);

        try {
          // Resolve placeholders in the alias command string
          let resolvedCommand = aliasCommand;
          const placeholderRegex = /\{(\d+)\}/g;
          const placeholders = new Set();
          let match;

          // Find all unique placeholder indices
          while ((match = placeholderRegex.exec(aliasCommand)) !== null) {
            placeholders.add(parseInt(match[1]));
          }

          // Check if all required placeholders have arguments
          const maxPlaceholderIndex = placeholders.size > 0 ? Math.max(...Array.from(placeholders)) : -1;
          if (maxPlaceholderIndex >= args.length) {
            message.client.currentAliasExecution.delete(aliasKey);
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias \`${commandName}\` requires at least **${maxPlaceholderIndex + 1}** argument${maxPlaceholderIndex + 1 === 1 ? '' : 's'}. Missing argument for placeholder \`{${maxPlaceholderIndex}}\`.`);
            return message.reply({ embeds: [errorEmbed] }).catch(() => {});
          }

          // Replace all instances of each placeholder
          for (const placeholderIndex of placeholders) {
            if (placeholderIndex < args.length) {
              const placeholderPattern = new RegExp(`\\{${placeholderIndex}\\}`, 'g');
              resolvedCommand = resolvedCommand.replace(placeholderPattern, args[placeholderIndex]);
            }
          }

          // Parse the resolved command
          const resolvedArgs = resolvedCommand.trim().split(/\s+/).filter(arg => arg.length > 0);
          if (resolvedArgs.length === 0) {
            message.client.currentAliasExecution.delete(aliasKey);
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias \`${commandName}\` resolved to an empty command.`);
            return message.reply({ embeds: [errorEmbed] }).catch(() => {});
          }

          const targetCommandName = resolvedArgs[0].toLowerCase();
          const targetArgs = resolvedArgs.slice(1);

          // Check if target command exists
          const targetCommand = client.commands.get(targetCommandName);
          if (!targetCommand) {
            message.client.currentAliasExecution.delete(aliasKey);
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Alias \`${commandName}\` points to command \`${targetCommandName}\` which does not exist.`);
            return message.reply({ embeds: [errorEmbed] }).catch(() => {});
          }

          // Execute the target command with resolved arguments
          try {
            await targetCommand.execute(message, targetArgs, {
              prefix,
              client,
              autoResponses,
              filteredWords,
              forcedNicknames,
              saveData,
              getUser,
              slurData: dbHelpers.getAllSlurCounts()
            });
          } catch (error) {
            console.error(`Error executing alias ${commandName}:`, error);
            const errorEmbed = new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while executing alias \`${commandName}\`.`);
            await message.reply({ embeds: [errorEmbed] }).catch(() => {});
          } finally {
            // Remove alias from execution tracking
            message.client.currentAliasExecution.delete(aliasKey);
          }

          return; // Alias handled, don't continue with normal command execution
        } catch (error) {
          // Clean up on error
          if (message.client.currentAliasExecution) {
            message.client.currentAliasExecution.delete(aliasKey);
          }
          console.error(`Error processing alias ${commandName}:`, error);
          const errorEmbed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while processing alias \`${commandName}\`.`);
          return message.reply({ embeds: [errorEmbed] }).catch(() => {});
        }
      }
    }

    const realCommand = client.commands.get(commandName) || client.commands.get(aliasMap.get(commandName));
    if (!realCommand) {
      // Command not found - silently return (user might be typing)
      return;
    }

    // Track command for spam detection (use actual command name)
    const actualCommandName = realCommand.name || commandName;
    const spamCheck = checkSpam(message.author.id, member, actualCommandName, client);
    
    // If user is now spamming after this check, don't execute command
    if (spamCheck.isSpamming || (spamCheck.isSpam && spamCheck.warning)) {
      // Only send warning on first spam detection
      if (spamCheck.warning && spamCheck.warningCount === 1) {
        const warningEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`<:alert:1363009864112144394> <:arrows:1363099226375979058> **Spam Warning ${spamCheck.warningCount}/${MAX_WARNINGS}**\n-# You are spamming commands. ${MAX_WARNINGS - spamCheck.warningCount} more violation(s) will result in a temporary blacklist.`);
        await message.reply({ embeds: [warningEmbed] }).catch(() => {});
      }
      // Silently ignore subsequent spam commands to avoid stressing the bot
      return;
    }
    
    if (spamCheck.isSpam && spamCheck.blacklisted) {
      // User is now blacklisted - send report and silently ignore
      sendBlacklistReport(client, message.author.id, 'spam', {
        commands: spamCheck.commands || [],
        warningCount: MAX_WARNINGS,
        level: spamCheck.level,
        duration: spamCheck.duration
      });
      return;
    }

    try {
      await realCommand.execute(message, args, {
        prefix,
        client,
        autoResponses,
        filteredWords,
        forcedNicknames,
        saveData,
        getUser,
        slurData: dbHelpers.getAllSlurCounts()
      });
      
      // Track command for antinuke if applicable
      const antinukeCommand = client.commands.get('antinuke');
      if (antinukeCommand && antinukeCommand.trackCommand) {
        antinukeCommand.trackCommand(message.guild, message.author.id, commandName).catch(() => {});
      }
      
      commandCooldowns.set(cooldownKey, Date.now());
      setTimeout(() => commandCooldowns.delete(cooldownKey), COOLDOWN_DURATION);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:alert:1363009864112144394> <:arrows:1363099226375979058> **Unknown Error Occurred**')
        .addFields(
          { name: '', value: '-# A copy of this error has been sent to the **developer** for review.' }
        )
        .setFooter({ text: `Error ID: ${Date.now()}` });
      await message.reply({ embeds: [errorEmbed] });

      const logChannel = message.client.channels.cache.get('1457556095957729324');
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setTitle('Command Error Logged')
          .addFields(
            { name: 'Error Message', value: `\`\`\`${error.message}\`\`\``, inline: false },
            { name: 'Error Code', value: `\`\`\`${error.code || 'N/A'}\`\`\``, inline: false },
            { name: 'Server', value: message.guild.name, inline: true },
            { name: 'Server ID', value: message.guild.id, inline: true },
            { name: 'Command Used By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Channel', value: message.channel.name, inline: true },
            { name: 'Command Used', value: `\`\`\`${message.content}\`\`\``, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: `Error ID: ${Date.now()}` });

        logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error('Error in message handler:', error);
  }
});

client.on('guildMemberAdd', async (member) => {
  // Hardban check
  const bannedIds = dbHelpers.getHardbannedUsers(member.guild.id);

  if (bannedIds && bannedIds.includes(member.id)) {
    try {
      await member.ban({ reason: 'Auto-banned user for rejoining while hardbanned' });
    } catch (err) {
      console.error(`Failed to auto-ban hardbanned user ${member.user.tag}:`, err);
    }
  }

});


// Enforce forced nicknames when members update their profile
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const guildForcedNicknames = forcedNicknames.get(newMember.guild.id);
  if (!guildForcedNicknames) return;
  
  const forcedNick = guildForcedNicknames.get(newMember.id);
  if (forcedNick && newMember.nickname !== forcedNick) {
    await newMember.setNickname(forcedNick, 'Enforcing forced nickname').catch(() => {});
  }
});

client.on('messageDelete', (message) => {
  if (!message.partial && message.author && !message.author.bot) {
    const attachment = message.attachments.first();
    const content = message.content || '';
    let imageUrl = attachment ? attachment.url : null;

    const gifRegex = /(https?:\/\/.*\.(?:gif))/i;
    const tenorRegex = /(https?:\/\/tenor\.com\/view\/[^\s]+)/i;

    const gifMatch = content.match(gifRegex);
    const tenorMatch = content.match(tenorRegex);

    if (!content && !attachment && !tenorMatch) return;

    if (!imageUrl) {
      imageUrl = gifMatch?.[1] || null;
      if (!imageUrl && tenorMatch) {
      imageUrl = tenorMatch[1];
      }
    }

    const snipedMessage = {
      content,
      author: message.author.tag,
      avatar: message.author.displayAvatarURL({ dynamic: true }),
      attachment: imageUrl,
      timestamp: Date.now(),
    };

    const channelId = message.channel.id;
    const existingMessages = client.deletedMessages.get(channelId) || [];
    existingMessages.unshift(snipedMessage);

    if (existingMessages.length > 10) {
      existingMessages.length = 10;
    }

    client.deletedMessages.set(channelId, existingMessages);
  }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  if (oldMessage.partial || newMessage.partial ||
      !oldMessage.author || oldMessage.author.bot ||
      oldMessage.content === newMessage.content) {
    return;
  }

  const attachment = oldMessage.attachments.first();
  const content = oldMessage.content || '';
  let imageUrl = attachment ? attachment.url : null;

  const gifRegex = /(https?:\/\/.*\.(?:gif))/i;
  const tenorRegex = /(https?:\/\/tenor\.com\/view\/[^\s]+)/i;

  const gifMatch = content.match(gifRegex);
  const tenorMatch = content.match(tenorRegex);

  if (!imageUrl) {
    imageUrl = gifMatch?.[1] || null;
    if (!imageUrl && tenorMatch) {
      imageUrl = tenorMatch[1];
    }
  }

  const editedMessage = {
    originalContent: oldMessage.content,
    editedContent: newMessage.content,
    author: oldMessage.author.tag,
    avatar: oldMessage.author.displayAvatarURL({ dynamic: true }),
    attachment: imageUrl,
    timestamp: Date.now(),
  };

  const channelId = oldMessage.channel.id;
  const existingMessages = client.editedMessages.get(channelId) || [];
  existingMessages.unshift(editedMessage);

  if (existingMessages.length > 10) {
    existingMessages.length = 10;
  }

  client.editedMessages.set(channelId, existingMessages);
});

// Initialize antinuke system
const antinukeCommand = client.commands.get('antinuke');
if (antinukeCommand && antinukeCommand.setup) {
  antinukeCommand.setup(client);
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Error: DISCORD_TOKEN is not set in environment variables!');
  process.exit(1);
}
client.login(token);

autoroleCommand.setup(client);

module.exports = {
  client,
  storeData, // Legacy - kept for backward compatibility
  saveData, // Legacy - kept for backward compatibility
  birthdays,
  dbHelpers
};