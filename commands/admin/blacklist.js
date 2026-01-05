const { EmbedBuilder, ChannelType } = require('discord.js');
const { dbHelpers } = require('../../db');

const AUTHORIZED_USER_ID = '1448417272631918735';
const LOG_CHANNEL_ID = '1457555286452600832';

module.exports = {
  name: 'blacklist',
  aliases: ['bl'],
  category: 'admin',
  description: '<:arrows:1363099226375979058> Manage the bot blacklist (Admin only).',
  async execute(message, args, { prefix }) {
    // Only allow authorized user
    if (message.author.id !== AUTHORIZED_USER_ID) {
      return; // Silently ignore other users
    }

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}blacklist add <user|server>\`\`\``,
              `\`\`\`${prefix}blacklist remove <user|server>\`\`\``,
              `\`\`\`${prefix}blacklist list\`\`\``,
              '-# <:arrows:1363099226375979058> Add or remove users/servers from the blacklist, or view all blacklisted items.',
              '',
              `**Examples:**`,
              `\`${prefix}blacklist add @user\``,
              `\`${prefix}blacklist add 123456789012345678\` (user or server ID)`,
              `\`${prefix}blacklist remove @user\``,
              `\`${prefix}blacklist list\``,
              '\n**Aliases:** `bl`'
            ].join('\n'))
        ]
      });
    }

    const subcommand = args[0].toLowerCase();

    if (subcommand === 'add') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a user or server to add to the blacklist.\n\`\`\`${prefix}blacklist add <user|server>\`\`\``)
          ]
        });
      }

      const input = args[1];
      let id;
      let isServer = false;

      // Check if it's a mention
      if (input.startsWith('<@') && input.endsWith('>')) {
        id = input.slice(2, -1).replace('!', '');
      } else if (/^\d{17,19}$/.test(input)) {
        id = input;
        // Try to determine if it's a server by checking if bot is in it
        const guild = message.client.guilds.cache.get(id);
        if (guild) {
          isServer = true;
        } else {
          // Try to fetch as user first, if fails assume it's a server ID
          try {
            await message.client.users.fetch(id);
            isServer = false;
          } catch {
            isServer = true; // Assume server if user fetch fails
          }
        }
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid format. Please mention a user, provide a user ID, or provide a server ID.`)
          ]
        });
      }

      if (isServer) {
        if (dbHelpers.isServerBlacklisted(id)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Server \`${id}\` is already blacklisted.`)
            ]
          });
        }

        dbHelpers.addBlacklistedServer(id);
        
        // If bot is already in this server, send notification and leave
        const targetGuild = message.client.guilds.cache.get(id);
        if (targetGuild) {
          try {
            // Find a channel to send the message to
            const notificationChannel = targetGuild.systemChannel || targetGuild.channels.cache.find(channel =>
              channel.type === ChannelType.GuildText && channel.permissionsFor(targetGuild.members.me)?.has(['SendMessages', 'ViewChannel'])
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
            console.error(`Failed to send blacklist notification to server ${id}:`, error);
          }

          // Leave the server
          try {
            await targetGuild.leave();
          } catch (error) {
            console.error(`Failed to leave blacklisted server ${id}:`, error);
          }
        }
      } else {
        if (dbHelpers.isUserBlacklisted(id)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User <@${id}> is already blacklisted.`)
            ]
          });
        }

        dbHelpers.addBlacklistedUser(id);
      }

      // Send blacklist report
      const logChannel = await message.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel) {
        let reportEmbed;
        
        if (isServer) {
          let targetGuild;
          try {
            targetGuild = await message.client.guilds.fetch(id);
          } catch (error) {
            targetGuild = { id, name: 'Unknown Server' };
          }

          reportEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Server Blacklisted')
            .addFields(
              { name: 'Server', value: targetGuild.name ? `${targetGuild.name} (\`${id}\`)` : `\`${id}\``, inline: true },
              { name: 'Server ID', value: `\`${id}\``, inline: true },
              { name: 'Reason', value: '👤 Manually blacklisted by developer', inline: true },
              { name: 'Blacklisted By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
              { name: 'Command Used In', value: message.guild ? `${message.guild.name} (\`${message.guild.id}\`)` : 'DM', inline: true }
            )
        } else {
          let targetUser;
          try {
            targetUser = await message.client.users.fetch(id);
          } catch (error) {
            targetUser = { id, tag: 'Unknown User', username: 'Unknown', discriminator: '0000' };
          }

          reportEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('User Blacklisted')
            .setThumbnail(targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null)
            .addFields(
              { name: 'User', value: `<@${id}> (${targetUser.tag || `${targetUser.username}#${targetUser.discriminator || '0000'}`})`, inline: true },
              { name: 'User ID', value: `\`${id}\``, inline: true },
              { name: 'Reason', value: '👤 Manually blacklisted by developer', inline: true },
              { name: 'Blacklisted By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
              { name: 'Command Used In', value: message.guild ? `${message.guild.name} (\`${message.guild.id}\`)` : 'DM', inline: true }
            )
        }

        await logChannel.send({ embeds: [reportEmbed] }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Added** ${isServer ? `server \`${id}\`` : `<@${id}>`} to the blacklist.`)
        ]
      });
    }

    if (subcommand === 'remove' || subcommand === 'unblacklist') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a user or server to remove from the blacklist.\n\`\`\`${prefix}blacklist remove <user|server>\`\`\``)
          ]
        });
      }

      const input = args[1];
      let id;
      let isServer = false;

      // Check if it's a mention
      if (input.startsWith('<@') && input.endsWith('>')) {
        id = input.slice(2, -1).replace('!', '');
      } else if (/^\d{17,19}$/.test(input)) {
        id = input;
        // Check if it's in blacklisted servers
        if (dbHelpers.isServerBlacklisted(id)) {
          isServer = true;
        } else if (dbHelpers.isUserBlacklisted(id)) {
          isServer = false;
        } else {
          // Try to determine if it's a server by checking if bot is in it
          const guild = message.client.guilds.cache.get(id);
          if (guild) {
            isServer = true;
          }
        }
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid format. Please mention a user, provide a user ID, or provide a server ID.`)
          ]
        });
      }

      let removed = false;

      if (isServer) {
        if (!dbHelpers.isServerBlacklisted(id)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Server \`${id}\` is not blacklisted.`)
            ]
          });
        }
        dbHelpers.removeBlacklistedServer(id);
        removed = true;
      } else {
        // Check if user is in permanent blacklist or has temporary blacklist
        const isPermanentlyBlacklisted = dbHelpers.isUserBlacklisted(id);
        const hasTemporaryBlacklist = dbHelpers.getBlacklistLevel(id) > 0;
        
        if (!isPermanentlyBlacklisted && !hasTemporaryBlacklist) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User <@${id}> is not blacklisted.`)
            ]
          });
        }

        // Remove from blacklist (both permanent and temporary)
        if (isPermanentlyBlacklisted) {
          dbHelpers.removeBlacklistedUser(id);
          removed = true;
        }
        
        // Also clear spam warnings, blacklist levels, and expirations
        dbHelpers.setSpamWarningCount(id, 0);
        dbHelpers.setBlacklistLevel(id, 0);
        dbHelpers.setBlacklistExpiration(id, null);
      }

      // Send blacklist removal report
      const logChannel = await message.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel) {
        let reportEmbed;
        
        if (isServer) {
          let targetGuild;
          try {
            targetGuild = await message.client.guilds.fetch(id);
          } catch (error) {
            targetGuild = { id, name: 'Unknown Server' };
          }

          reportEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('Server Removed from Blacklist')
            .addFields(
              { name: 'Server', value: targetGuild.name ? `${targetGuild.name} (\`${id}\`)` : `\`${id}\``, inline: true },
              { name: 'Server ID', value: `\`${id}\``, inline: true },
              { name: 'Removed By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
              { name: 'Command Used In', value: message.guild ? `${message.guild.name} (\`${message.guild.id}\`)` : 'DM', inline: true }
            )
        } else {
          let targetUser;
          try {
            targetUser = await message.client.users.fetch(id);
          } catch (error) {
            targetUser = { id, tag: 'Unknown User', username: 'Unknown', discriminator: '0000' };
          }

          reportEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('User Removed from Blacklist')
            .setThumbnail(targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null)
            .addFields(
              { name: 'User', value: `<@${id}> (${targetUser.tag || `${targetUser.username}#${targetUser.discriminator || '0000'}`})`, inline: true },
              { name: 'User ID', value: `\`${id}\``, inline: true },
              { name: 'Removed By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
              { name: 'Command Used In', value: message.guild ? `${message.guild.name} (\`${message.guild.id}\`)` : 'DM', inline: true }
            )
        }

        await logChannel.send({ embeds: [reportEmbed] }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Removed** ${isServer ? `server \`${id}\`` : `<@${id}>`} from the blacklist.`)
        ]
      });
    }

    if (subcommand === 'list') {
      const blacklistedUsers = dbHelpers.getAllBlacklistedUsers();
      const blacklistedServers = dbHelpers.getAllBlacklistedServers();

      if (blacklistedUsers.length === 0 && blacklistedServers.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:arrows:1363099226375979058> No users or servers are currently blacklisted.')
          ]
        });
      }

      const embeds = [];
      
      if (blacklistedUsers.length > 0) {
        const userList = blacklistedUsers.map(id => `<@${id}>`).join('\n') || 'None';
        embeds.push(
          new EmbedBuilder()
            .setColor('#838996')
            .setTitle('Blacklisted Users')
            .setDescription(userList.length > 4096 ? userList.slice(0, 4093) + '...' : userList)
            .setFooter({ text: `Total: ${blacklistedUsers.length} user(s)` })
        );
      }

      if (blacklistedServers.length > 0) {
        const serverList = blacklistedServers.map(id => `\`${id}\``).join('\n') || 'None';
        embeds.push(
          new EmbedBuilder()
            .setColor('#838996')
            .setTitle('Blacklisted Servers')
            .setDescription(serverList.length > 4096 ? serverList.slice(0, 4093) + '...' : serverList)
            .setFooter({ text: `Total: ${blacklistedServers.length} server(s)` })
        );
      }

      return message.reply({ embeds });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid subcommand. Use \`add\`, \`remove\`, or \`list\`.`)
      ]
    });
  }
};

