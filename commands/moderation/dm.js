const { EmbedBuilder, PermissionsBitField, Events } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'dm',
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Manage the server\'s DM messages.',
  async execute(message, args, { prefix }) {
    // Check permissions - require Manage Guild or be server owner
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && message.guild.ownerId !== message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Guild** permissions or be the **server owner** to use this command.')
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
          `\`\`\`${prefix}dm (subcommand) (args)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `set <message>` - Set the DM message',
          '<:leese:1457834970486800567> `toggle` or `on/off` - Enable/disable DM messages',
          '<:leese:1457834970486800567> `view` - View current settings',
          '<:leese:1457834970486800567> `test` - Test the DM message (sends DM to you)',
          '<:tree:1457808523986731008> `remove` - Remove the DM message',
          '',
          '**Aliases:** `N/A`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // View current settings
    if (subcommand === 'view') {
      const config = dbHelpers.getWelcomeMessage(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This server has **no DM message** set.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> DM Message Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Message', value: config.message.length > 1024 ? config.message.substring(0, 1021) + '...' : config.message, inline: false }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Toggle enable/disable
    if (subcommand === 'toggle' || subcommand === 'on' || subcommand === 'off') {
      const config = dbHelpers.getWelcomeMessage(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to **set a DM message** first using `' + prefix + 'dm set <message>`.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      let enabled;
      if (subcommand === 'toggle') {
        enabled = !config.enabled;
      } else {
        enabled = subcommand === 'on';
      }

      dbHelpers.setWelcomeEnabled(guildId, enabled);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(enabled 
              ? '<:check:1457808518848581858> <:arrows:1457808531678957784> DM messages are now **enabled**.'
              : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> DM messages are now **disabled**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Set DM message
    if (subcommand === 'set') {
      const messageText = args.slice(1).join(' ');
      
      if (!messageText) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}dm set <message>\`\`\``,
                '-# <:arrows:1457808531678957784> Message that will be sent as **DM** to new members.',
                '',
                `**Example:** \`${prefix}dm set join discord.gg/[vanity]\``,
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Validate message length (Discord message limit is 2000)
      if (messageText.length > 2000) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The message is too long. \n -# <:tree:1457808523986731008> Maximum length is **2000 characters**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.setWelcomeMessage(guildId, messageText, null);
      dbHelpers.setWelcomeEnabled(guildId, true); // Auto-enable when setting

      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> DM message has been **set** and **enabled**.')
        .addFields(
          { name: 'Message', value: messageText.length > 1024 ? messageText.substring(0, 1021) + '...' : messageText, inline: false }
        );

      return message.reply({
        embeds: [successEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Test DM message
    if (subcommand === 'test') {
      const config = dbHelpers.getWelcomeMessage(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to **set a DM message** first using `' + prefix + 'dm set <message>`.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      try {
        // Replace placeholders
        let testMessage = config.message
          .replace(/{user}/g, message.author.toString())
          .replace(/{server}/g, message.guild.name)
          .replace(/{memberCount}/g, message.guild.memberCount.toString())
          .replace(/{username}/g, message.author.username);

        // IMPORTANT: Send ONLY plain text, no embeds
        await message.author.send(testMessage).catch(() => {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I couldn\'t send you a DM. \n -# <:tree:1457808523986731008> Please make sure your **DMs are enabled**.')
            ],
            allowedMentions: { repliedUser: false }
          });
        });

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Test DM message sent to your **DMs**!')
          ],
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        console.error('Error testing DM message:', error);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while testing the DM message.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    // Remove DM message
    if (subcommand === 'remove') {
      const config = dbHelpers.getWelcomeMessage(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This server has **no DM message** to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.removeWelcomeMessage(guildId);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> DM message has been **removed**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. \n -# <:tree:1457808523986731008> Use `set`, `toggle`, `on`, `off`, `view`, `test`, or `remove`.')
      ],
      allowedMentions: { repliedUser: false }
    });
  },

  setup: (client) => {
    client.on(Events.GuildMemberAdd, async (member) => {
      const config = dbHelpers.getWelcomeMessage(member.guild.id);
      if (!config || !config.enabled) return;

      try {
        // Replace placeholders
        let dmMessage = config.message
          .replace(/{user}/g, member.toString())
          .replace(/{server}/g, member.guild.name)
          .replace(/{memberCount}/g, member.guild.memberCount.toString())
          .replace(/{username}/g, member.user.username);

        // IMPORTANT: Send ONLY plain text, no embeds, no content object
        await member.send(dmMessage).catch(() => {
          // Silently fail if DMs are disabled
        });
      } catch (error) {
        // Silently fail
      }
    });
  }
};