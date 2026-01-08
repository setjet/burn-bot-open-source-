const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

// Configuration
const SUPPORT_CATEGORY_ID = '1458629151853645961';
const BUGS_CATEGORY_ID = '1458629235769081996';
const STAFF_ROLE_ID = '1458579526249349140';

// In-memory ticket blacklist (replace with database later if needed)
const ticketBlacklist = new Set();

module.exports = {
  name: 'ticket',
  async execute(message, args, { prefix, getUser }) {
    // Only allow specific user to use this command
    if (message.author.id !== '1448417272631918735') {
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    // Handle blacklist subcommand
    if (subcommand === 'blacklist' && args[1]?.toLowerCase() !== 'remove') {
      const userInput = args.slice(1).join(' ');
      
      if (!userInput) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}ticket blacklist <user>\`\`\``,
                `\`\`\`${prefix}ticket blacklist remove <user>\`\`\``,
                '-# <:arrows:1457808531678957784> Blacklist a user from creating tickets or remove them from the blacklist.',
                '',
                `**Example:** \`${prefix}ticket blacklist @User\``,
                `**Example:** \`${prefix}ticket blacklist 123456789\``,
                `**Example:** \`${prefix}ticket blacklist remove @User\``,
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const targetUser = await getUser(message, userInput);
      
      if (!targetUser) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found. Please provide a valid user mention, ID, or username.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if already blacklisted
      if (ticketBlacklist.has(targetUser.id)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> ${targetUser} is already blacklisted from creating tickets.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Add to blacklist
      ticketBlacklist.add(targetUser.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> ${targetUser} has been blacklisted from creating tickets.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Handle unblacklist subcommand
    if (subcommand === 'unblacklist' || (subcommand === 'blacklist' && args[1]?.toLowerCase() === 'remove')) {
      // Support both "!ticket unblacklist <user>" and "!ticket blacklist remove <user>"
      const userInput = subcommand === 'unblacklist' ? args.slice(1).join(' ') : args.slice(2).join(' ');
      
      if (!userInput) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}ticket unblacklist <user>\`\`\``,
                `\`\`\`${prefix}ticket blacklist remove <user>\`\`\``,
                '-# <:arrows:1457808531678957784> Remove a user from the ticket blacklist.',
                '',
                `**Example:** \`${prefix}ticket unblacklist @User\``,
                `**Example:** \`${prefix}ticket blacklist remove @User\``,
                '',
                '**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const targetUser = await getUser(message, userInput);
      
      if (!targetUser) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found. Please provide a valid user mention, ID, or username.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if blacklisted
      if (!ticketBlacklist.has(targetUser.id)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> ${targetUser} is not blacklisted from creating tickets.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Remove from blacklist
      ticketBlacklist.delete(targetUser.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> ${targetUser} has been removed from the ticket blacklist.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Default: Create ticket panel
    const ticketEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:ticketing:1458621658490208422> <:arrows:1457808531678957784> Support Tickets')
      .setDescription([
        'Click a button below to create a ticket for support or to report bugs!',
        '',
        '-# **Get assistance for questions, account issues, setup help, or other concerns.**',
        '-# **Report any bugs, glitches, or unintended behavior you have discovered.**',
        '',
        '-# Please provide **as much relevant detail as possible** so we can help quickly.',
        '-# Abusing this panel with **invalid** or **troll tickets** may result in being **blacklisted** from creating future tickets.'
      ].join('\n'));

    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_support')
          .setLabel('Support')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_bugs')
          .setLabel('Bugs')
          .setStyle(ButtonStyle.Secondary)
      );

    // Send the ticket panel
    await message.channel.send({
      embeds: [ticketEmbed],
      components: [row]
    });

    // Delete the command message
    if (message.deletable) {
      await message.delete().catch(() => {});
    }
  },

  setup: (client) => {
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      
      const { customId, guild, member, channel } = interaction;

      // Handle ticket buttons
      if (customId === 'ticket_support' || customId === 'ticket_bugs') {
        const ticketType = customId === 'ticket_support' ? 'Support' : 'Bugs';
        const ticketEmoji = customId === 'ticket_support' ? '💬' : '🐛';
        const categoryId = customId === 'ticket_support' ? SUPPORT_CATEGORY_ID : BUGS_CATEGORY_ID;
        
        try {
          // CRITICAL: Reply immediately
          await interaction.reply({
            content: '<a:loading:1458064376165564577> Creating your ticket...',
            ephemeral: true
          });
        } catch (err) {
          console.error('Failed initial reply:', err);
          return;
        }

        try {
          // Check if user is blacklisted
          if (ticketBlacklist.has(member.id)) {
            return await interaction.editReply({
              content: 'You\'ve been blacklisted from creating any future tickets.'
            });
          }

          // Check for existing open ticket (exclude closed tickets)
          const existingTicket = guild.channels.cache.find(
            ch => ch.topic && 
                  ch.topic.includes(member.id) && 
                  ch.name.startsWith('ticket-') && 
                  !ch.name.includes('-closed')
          );

          if (existingTicket) {
            return await interaction.editReply({
              content: `You already have an open ticket: ${existingTicket}`
            });
          }

          // Create channel name
          let username = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || member.user.id;
          const channelName = `ticket-${username}`;

          // Create ticket channel with specific category and staff role permissions
          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `${ticketType} ticket for ${member.user.tag} (${member.id})`,
            parent: categoryId,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: member.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.AttachFiles
                ]
              },
              {
                id: client.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageChannels
                ]
              },
              {
                id: STAFF_ROLE_ID,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.AttachFiles,
                  PermissionsBitField.Flags.ManageMessages
                ]
              }
            ]
          });

          // Create close button
          const closeRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
            );

          // Send welcome message
          const welcomeEmbed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `You've created a **${ticketType.toLowerCase()}** ticket.`,
              '-# <:tree:1457808523986731008> A <@&1458579526249349140> member will be with you shortly.',
              '',
              '-# **While you wait, please provide as much relevant detail as possible so we can help quickly.**',
              '',
              '-# Spam pinging will result in being ignored.',
            ].join('\n'));

          await ticketChannel.send({
            content: `${member}`,
            embeds: [welcomeEmbed],
            components: [closeRow]
          });

          // Success
          await interaction.editReply({
            content: `Your ticket has been created: ${ticketChannel}`
          });

        } catch (error) {
          console.error('Ticket creation error:', error);
          
          try {
            await interaction.editReply({
              content: 'Failed to create ticket. Please contact an administrator.'
            });
          } catch (e) {
            console.error('Failed to send error:', e);
          }
        }
      }

      // Handle close button
      if (customId === 'ticket_close') {
        try {
          if (!channel.name.startsWith('ticket-')) {
            return await interaction.reply({
              content: 'This is not a ticket channel.',
              ephemeral: true
            });
          }

          const ticketOwnerId = channel.topic?.match(/\((\d+)\)/)?.[1];

          // Allow ticket owner, staff role, or users with Manage Channels to close
          const hasStaffRole = member.roles.cache.has(STAFF_ROLE_ID);
          const hasManageChannels = member.permissions.has(PermissionsBitField.Flags.ManageChannels);

          if (member.id !== ticketOwnerId && !hasStaffRole && !hasManageChannels) {
            return await interaction.reply({
              content: 'Only the ticket owner or staff can close this ticket.',
              ephemeral: true
            });
          }

          // Check if ticket is already closed
          const isClosed = channel.name.includes('-closed');

          if (isClosed) {
            // Only staff can delete closed tickets
            if (!hasStaffRole && !hasManageChannels) {
              return await interaction.reply({
                content: 'This ticket is already closed. Only staff can delete it.',
                ephemeral: true
              });
            }

            // Staff deleting the ticket
            await interaction.reply({
              content: '<a:loading:1458064376165564577> Deleting ticket in 5 seconds...'
            });

            setTimeout(async () => {
              try {
                await channel.delete();
              } catch (error) {
                console.error('Delete error:', error);
              }
            }, 5000);
          } else {
            // User or staff closing the ticket (not deleting)
            await interaction.reply({
              content: '<a:loading:1458064376165564577> Closing ticket...'
            });

            try {
              // Rename channel to show it's closed
              await channel.setName(`${channel.name}-closed`);

              // Remove ticket owner's permissions (they can no longer see it)
              await channel.permissionOverwrites.edit(ticketOwnerId, {
                ViewChannel: false
              });

              // Update button to "Delete Ticket" for staff
              const deleteRow = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Delete Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
                );

              // Send closed message
              const closedEmbed = new EmbedBuilder()
                .setColor('#838996')
                .setDescription([
                  `Ticket closed by ${member}`,
                  '',
                  '-# Staff can now review and delete this ticket using the button below.'
                ].join('\n'));

              await channel.send({
                embeds: [closedEmbed],
                components: [deleteRow]
              });

              await interaction.editReply({
                content: 'Ticket has been closed. Staff can still access and delete it.'
              });

            } catch (error) {
              console.error('Error closing ticket:', error);
              await interaction.editReply({
                content: 'Failed to close ticket. Please try again.'
              });
            }
          }

        } catch (error) {
          console.error('Close error:', error);
        }
      }
    });
  }
};