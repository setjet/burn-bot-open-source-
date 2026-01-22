const { EmbedBuilder, PermissionsBitField, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'burnwelcome',
  category: 'admin',
  aliases: ['bw'],
  description: '<:arrows:1457808531678957784> Manage the server\'s welcome DM messages.',
  async execute(message, args, { prefix }) {
    // Only allow authorized user
    const AUTHORIZED_USER_ID = '1355470391102931055';
    if (message.author.id !== AUTHORIZED_USER_ID) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You are not authorized to use this command.')
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
          `\`\`\`${prefix}burnwelcome (subcommand) (args)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `channel <#channel>` - Set the channel for welcome messages',
          '<:leese:1457834970486800567> `toggle` or `on/off` - Enable/disable welcome messages',
          '<:leese:1457834970486800567> `view` - View current settings',
          '<:leese:1457834970486800567> `test` - Test the welcome message (sends to channel)',
          '<:tree:1457808523986731008> `remove` - Remove the welcome message',
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
      const config = dbHelpers.getBurnWelcome(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This server has **no welcome message** set.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const status = config.enabled ? '<:check:1457808518848581858> **Enabled**' : '<:disallowed:1457808577786806375> **Disabled**';

      const channelField = config.channelId 
        ? `<#${config.channelId}>` 
        : 'Not set';

      const viewEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Burn Welcome Settings')
        .addFields(
          { name: 'Status', value: status, inline: true },
          { name: 'Channel', value: channelField, inline: true }
        );

      return message.reply({
        embeds: [viewEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Toggle enable/disable
    if (subcommand === 'toggle' || subcommand === 'on' || subcommand === 'off') {
      const config = dbHelpers.getBurnWelcome(guildId);
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to **set a welcome channel** first using `' + prefix + 'burnwelcome channel <#channel>`.')
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

      dbHelpers.setBurnWelcomeEnabled(guildId, enabled);
      
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

    // Set welcome channel
    if (subcommand === 'channel') {
      const channelMention = args[1];
      
      if (!channelMention) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}burnwelcome channel <#channel>\`\`\``,
                '-# <:arrows:1457808531678957784> Set the channel where welcome messages will be sent.',
                '',
                `**Example:** \`${prefix}burnwelcome channel #welcome\``,
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Extract channel ID from mention
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

      if (channel.type !== 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please select a text channel.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.setBurnWelcomeChannel(guildId, channelId);
      dbHelpers.setBurnWelcomeEnabled(guildId, true); // Auto-enable when setting channel

      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Welcome channel has been set to ${channel} and **enabled**.`);

      return message.reply({
        embeds: [successEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Test welcome message
    if (subcommand === 'test') {
      const config = dbHelpers.getBurnWelcome(guildId);
      
      if (!config || !config.channelId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need to **set a welcome channel** first using `' + prefix + 'burnwelcome channel <#channel>`.')
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
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The welcome channel no longer exists. Please set a new one.')
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        // Create the welcome embed
        const welcomeEmbed = createWelcomeEmbed(message.author, message.guild);
        const inviteButton = createInviteButton(message.client);

        await channel.send({ 
          content: `hey ${message.author}, welcome!`,
          embeds: [welcomeEmbed],
          components: inviteButton ? [inviteButton] : []
        });

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Test welcome message sent to ${channel}!`)
          ],
          allowedMentions: { repliedUser: false }
        });
      } catch (error) {
        console.error('Error testing welcome message:', error);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while testing the welcome message. Make sure I have permission to send messages in that channel.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    // Remove welcome message
    if (subcommand === 'remove') {
      const config = dbHelpers.getBurnWelcome(guildId);
      
      if (!config) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This server has **no welcome message** to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.removeBurnWelcome(guildId);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:check:1457808518848581858> <:arrows:1457808531678957784> Welcome message has been **removed**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. Use `channel`, `toggle`, `on`, `off`, `view`, `test`, or `remove`.')
      ],
      allowedMentions: { repliedUser: false }
    });
  },

  setup: (client) => {
    client.on(Events.GuildMemberAdd, async (member) => {
      const config = dbHelpers.getBurnWelcome(member.guild.id);
      if (!config || !config.enabled || !config.channelId) return;

      try {
        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel) return; // Channel doesn't exist, silently fail

        // Create the welcome embed
        const welcomeEmbed = createWelcomeEmbed(member.user, member.guild);
        const inviteButton = createInviteButton(client);

        await channel.send({ 
          content: `hey ${member}, welcome!`,
          embeds: [welcomeEmbed],
          components: inviteButton ? [inviteButton] : []
        }).catch(() => {
          // Silently fail if bot doesn't have permission
        });
      } catch (error) {
        // Silently fail - don't log errors
      }
    });
  }
};

// Helper function to create the welcome embed
function createWelcomeEmbed(user, guild) {
  // Hardcoded channel IDs
  const supportChannelId = '1457554726802427948';
  const howToUseChannelId = '1457554702727254128';
  const suggestionsChannelId = '1458617211538243594';
  const updatesChannelId = '1457553821776744508';
  
  // Verify channels exist in the guild
  const supportChannel = guild.channels.cache.get(supportChannelId);
  const howToUseChannel = guild.channels.cache.get(howToUseChannelId);
  const suggestionsChannel = guild.channels.cache.get(suggestionsChannelId);
  const updatesChannel = guild.channels.cache.get(updatesChannelId);
  
  // Build channel list with clickable mentions
  const channelList = [
    `<:arrows:1457808531678957784> <#${supportChannelId}> - open tickets`,
    `<:arrows:1457808531678957784> <#${howToUseChannelId}> - setup bot`,
    `<:arrows:1457808531678957784> <#${suggestionsChannelId}> - send suggestions`,
    `<:arrows:1457808531678957784> <#${updatesChannelId}> new features + bug fixes`
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor('#838996')
    .setDescription([
      channelList,
      '',
      `You are member #${guild.memberCount}`
    ].join('\n'))
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));

  return embed;
}

// Helper function to create the invite button
function createInviteButton(client) {
  if (!client.user) return null;
  
  // Create OAuth2 invite URL with bot and applications.commands scopes
  const clientId = client.user.id;
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
  
  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl)
        .setEmoji('✨')
    );
  
  return buttonRow;
}
