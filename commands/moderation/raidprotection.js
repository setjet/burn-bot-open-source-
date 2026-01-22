const { EmbedBuilder, PermissionsBitField, Events } = require('discord.js');
const { dbHelpers, db } = require('../../db');

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

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}raidprotection (subcommand) (args)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `toggle` or `on/off` - Enable/disable raid protection',
          '<:leese:1457834970486800567> `threshold <number>` - Set member join threshold',
          '<:leese:1457834970486800567> `window <seconds>` - Set time window in seconds',
          '<:leese:1457834970486800567> `action <lockdown|ban>` - Set action when raid detected',
          '<:leese:1457834970486800567> `whitelist <user>` - Add/remove user from whitelist',
          '<:leese:1457834970486800567> `view` - View current settings',
          '<:tree:1457808523986731008> `remove` - Remove raid protection configuration',
          '',
          '**Aliases:** `raid`, `rp`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // View current settings
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

    // Toggle enable/disable
    if (subcommand === 'toggle' || subcommand === 'on' || subcommand === 'off') {
      let config = dbHelpers.getRaidProtection(guildId);
      
      if (!config) {
        // Create default config
        config = {
          enabled: false,
          memberThreshold: 5,
          timeWindow: 10000,
          action: 'lockdown',
          whitelist: []
        };
      }

      let enabled;
      if (subcommand === 'toggle') {
        enabled = !config.enabled;
      } else {
        enabled = subcommand === 'on';
      }

      config.enabled = enabled;
      dbHelpers.setRaidProtection(guildId, config);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(enabled 
              ? '<:check:1457808518848581858> <:arrows:1457808531678957784> Raid protection is now **enabled**.'
              : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Raid protection is now **disabled**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Set threshold
    if (subcommand === 'threshold') {
      const threshold = parseInt(args[1]);
      
      if (!threshold || isNaN(threshold) || threshold < 2 || threshold > 50) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a valid threshold between **2** and **50**.')
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

      config.memberThreshold = threshold;
      dbHelpers.setRaidProtection(guildId, config);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Member threshold set to **${threshold}** members.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Set time window
    if (subcommand === 'window') {
      const seconds = parseInt(args[1]);
      
      if (!seconds || isNaN(seconds) || seconds < 1 || seconds > 60) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a valid time window between **1** and **60** seconds.')
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

      config.timeWindow = seconds * 1000;
      dbHelpers.setRaidProtection(guildId, config);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Time window set to **${seconds}** seconds.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Set action
    if (subcommand === 'action') {
      const action = args[1]?.toLowerCase();
      
      if (!action || !['lockdown', 'ban'].includes(action)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a valid action: `lockdown` or `ban`.')
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

      config.action = action;
      dbHelpers.setRaidProtection(guildId, config);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Action set to **${action}**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

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

    // Remove configuration
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

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. \n -# <:tree:1457808523986731008> Use `toggle`, `threshold`, `window`, `action`, `whitelist`, `view`, or `remove`.')
      ],
      allowedMentions: { repliedUser: false }
    });
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

