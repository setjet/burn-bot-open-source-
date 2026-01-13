const { EmbedBuilder, Events, ChannelType } = require('discord.js');
const { dbHelpers } = require('../../db');

const AUTHORIZED_USER_ID = '1355470391102931055';

// Helper function to build the hardcoded welcome embed
function buildWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor('#57F287')
    .setTitle(`Welcome to ${member.guild.name}!`)
    .setDescription(`Hey ${member.toString()}, welcome to **${member.guild.name}**!\n\nWe're glad to have you here! Make sure to read the rules and have fun!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: `You are member #${member.guild.memberCount}` })
    .setTimestamp();
}

module.exports = {
  name: 'burnwelcome',
  aliases: ['bw'],
  category: 'admin',
  description: '<:arrows:1457808531678957784> Manage the bot server\'s welcome message (Admin only).',
  async execute(message, args, { prefix }) {
    // Only allow authorized user
    if (message.author.id !== AUTHORIZED_USER_ID) {
      return; // Silently ignore other users
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}burnwelcome (subcommand) (args)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `set <channel>` - Set the welcome channel',
          '<:leese:1457834970486800567> `toggle` or `on/off` - Enable/disable welcome messages',
          '<:leese:1457834970486800567> `view` - View current settings',
          '<:leese:1457834970486800567> `test` - Test the welcome message',
          '<:tree:1457808523986731008> `remove` - Remove the welcome channel',
          '',
          '**Note:** Welcome messages are sent as **embeds** in the specified channel when someone joins the bot\'s server.',
          '',
          '**Aliases:** `bw`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // View current settings
    if (subcommand === 'view') {
      const config = dbHelpers.getBotWelcome();
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No welcome channel has been **set** yet.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';
      const channelMention = `<#${config.channelId}>`;

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Bot Welcome Message Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Channel', value: channelMention, inline: true }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Toggle enable/disable
    if (subcommand === 'toggle' || subcommand === 'on' || subcommand === 'off') {
      const config = dbHelpers.getBotWelcome();
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to **set a welcome channel** first using `' + prefix + 'burnwelcome set <channel>`.')
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

      dbHelpers.setBotWelcomeEnabled(enabled);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(enabled 
              ? '<:check:1457808518848581858> <:arrows:1457808531678957784> Welcome messages are now **enabled**.'
              : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Welcome messages are now **disabled**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Set channel
    if (subcommand === 'set') {
      const channelInput = args[1];
      
      if (!channelInput) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}burnwelcome set <channel>\`\`\``,
                '-# <:arrows:1457808531678957784> Set the channel where welcome messages will be sent.',
                '',
                `**Example:** \`${prefix}burnwelcome set #welcome\``,
                `**Example:** \`${prefix}burnwelcome set 123456789012345678\``,
                '',
                '**Aliases:** `bw`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      let channel = null;
      
      // Try to parse as mention
      if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
        const channelId = channelInput.slice(2, -1);
        channel = message.guild.channels.cache.get(channelId);
      } else if (/^\d+$/.test(channelInput)) {
        // Try as ID
        channel = message.guild.channels.cache.get(channelInput);
      }

      if (!channel) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Channel not found. Please mention a channel or provide a valid channel ID.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (channel.type !== ChannelType.GuildText) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The channel must be a **text channel**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Get existing config or create new one
      const existingConfig = dbHelpers.getBotWelcome() || {};
      const newConfig = {
        ...existingConfig,
        channelId: channel.id,
        enabled: existingConfig.enabled !== undefined ? existingConfig.enabled : true
      };

      dbHelpers.setBotWelcome(newConfig);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Welcome channel set to ${channel.toString()}.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Test welcome message
    if (subcommand === 'test') {
      const config = dbHelpers.getBotWelcome();
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to **set a welcome channel** first using `' + prefix + 'burnwelcome set <channel>`.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      try {
        const channel = message.guild.channels.cache.get(config.channelId);
        if (!channel) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The welcome channel no longer exists.')
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        const embed = buildWelcomeEmbed(message.member);
        await channel.send({ embeds: [embed] });

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Test welcome message sent to ${channel.toString()}!`)
          ],
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        console.error('Error testing welcome message:', error);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while testing the welcome message.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    // Remove welcome channel
    if (subcommand === 'remove') {
      const config = dbHelpers.getBotWelcome();
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No welcome channel to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.removeBotWelcome();
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Welcome channel has been **removed**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. Use `set`, `toggle`, `on`, `off`, `view`, `test`, or `remove`.')
      ],
      allowedMentions: { repliedUser: false }
    });
  },

  setup: (client) => {
    client.on(Events.GuildMemberAdd, async (member) => {
      const config = dbHelpers.getBotWelcome();
      if (!config || !config.enabled || !config.channelId) return;

      try {
        const channel = member.guild.channels.cache.get(config.channelId);
        // Only send if channel exists in this server
        if (!channel || channel.guild.id !== member.guild.id) return;

        const embed = buildWelcomeEmbed(member);
        await channel.send({ embeds: [embed] }).catch(() => {
          // Silently fail if channel doesn't exist or bot lacks permissions
        });
      } catch (error) {
        // Silently fail - don't log errors for welcome messages
      }
    });
  }
};
