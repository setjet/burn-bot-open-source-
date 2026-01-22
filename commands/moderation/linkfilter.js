const { EmbedBuilder, PermissionsBitField, Events } = require('discord.js');
const { dbHelpers, db } = require('../../db');

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

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}linkfilter (subcommand) (args)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `toggle` or `on/off` - Enable/disable link filter',
          '<:leese:1457834970486800567> `action add <delete|warn|timeout>` - Add an action',
          '<:leese:1457834970486800567> `action remove <delete|warn|timeout>` - Remove an action',
          '<:leese:1457834970486800567> `allow <domain>` - Add allowed domain',
          '<:leese:1457834970486800567> `remove <domain>` - Remove allowed domain',
          '<:leese:1457834970486800567> `whitelist <user>` - Add/remove user from whitelist',
          '<:leese:1457834970486800567> `view` - View current settings',
          '<:tree:1457808523986731008> `remove` - Remove link filter configuration',
          '',
          '**Aliases:** `lf`, `filterlinks`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // View current settings
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

    // Toggle enable/disable
    if (subcommand === 'toggle' || subcommand === 'on' || subcommand === 'off') {
      let config = dbHelpers.getLinkFilter(guildId);
      
      if (!config) {
        config = {
          enabled: false,
          actions: ['delete'],
          whitelist: [],
          allowedDomains: []
        };
      }

      let enabled;
      if (subcommand === 'toggle') {
        enabled = !config.enabled;
      } else {
        enabled = subcommand === 'on';
      }

      config.enabled = enabled;
      dbHelpers.setLinkFilter(guildId, config);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(enabled 
              ? '<:check:1457808518848581858> <:arrows:1457808531678957784> Link filter is now **enabled**.'
              : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Link filter is now **disabled**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Manage actions
    if (subcommand === 'action') {
      const actionType = args[1]?.toLowerCase(); // 'add' or 'remove'
      const action = args[2]?.toLowerCase(); // 'delete', 'warn', or 'timeout'
      
      if (!actionType || !['add', 'remove'].includes(actionType)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}linkfilter action add <delete|warn|timeout>\`\`\``,
                `\`\`\`${prefix}linkfilter action remove <delete|warn|timeout>\`\`\``,
                '-# <:arrows:1457808531678957784> Add or remove an action when a link is detected.',
                '',
                `**Example:** \`${prefix}linkfilter action add delete\``,
                `**Example:** \`${prefix}linkfilter action add warn\``,
                `**Example:** \`${prefix}linkfilter action remove timeout\``
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (!action || !['delete', 'warn', 'timeout'].includes(action)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a valid action: `delete`, `warn`, or `timeout`.')
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

      if (!config.actions || !Array.isArray(config.actions)) {
        config.actions = config.action ? [config.action] : ['delete'];
      }

      if (actionType === 'add') {
        if (config.actions.includes(action)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Action \`${action}\` is already enabled.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }
        config.actions.push(action);
        dbHelpers.setLinkFilter(guildId, config);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Action \`${action}\` has been **added**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      } else {
        if (!config.actions.includes(action)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Action \`${action}\` is not enabled.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }
        if (config.actions.length === 1) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You must have at least one action enabled.')
            ],
            allowedMentions: { repliedUser: false }
          });
        }
        config.actions = config.actions.filter(a => a !== action);
        dbHelpers.setLinkFilter(guildId, config);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Action \`${action}\` has been **removed**.`)
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
    if (subcommand === 'remove') {
      const domain = args[1];
      
      if (!domain) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}linkfilter remove <domain>\`\`\``,
                '-# <:arrows:1457808531678957784> Remove a domain from the allowed list.',
                '',
                `**Example:** \`${prefix}linkfilter remove discord.gg\``
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

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

    // Remove configuration (only if no other subcommand matched)
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

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. \n -# <:tree:1457808523986731008> Use `toggle`, `action add/remove`, `allow`, `remove`, `whitelist`, `view`, or `remove`.')
      ],
      allowedMentions: { repliedUser: false }
    });
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
            const member = await message.guild.members.fetch(message.author.id).catch(() => null);
            if (member && message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
              await member.timeout(60000, 'Link filter violation').catch(() => {});
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

