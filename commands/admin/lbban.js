/*
 * lbban (aliases: leaderboardban, lbb) — Bot owner only (BOT_OWNER_ID).
 *
 * Bans users from appearing on the economy leaderboard (balance still exists; they’re hidden from the board).
 *
 * Usage:
 *   <prefix>lbban add <user>
 *   <prefix>lbban remove <user>
 *   <prefix>lbban list
 *   <prefix>lbban check <user>
 * Run with no subcommand for the full help embed.
 */

// leaderboard ban list rendering used to truncate wrong and i cried 😭

const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const config = require('../../config');

module.exports = {
  name: 'lbban',
  aliases: ['leaderboardban', 'lbb'],
  category: 'admin',
  description: '<:arrows:1457808531678957784> Ban users from the economy leaderboard (Admin only).',
  async execute(message, args, { prefix, getUser }) {
    if (!config.botOwnerId || message.author.id !== config.botOwnerId) {
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}lbban (subcommand) (user)\`\`\``,
          '-# <:arrows:1457808531678957784> **__Subcommands__**',
          '<:leese:1457834970486800567> `add <user>` - Ban a user from the leaderboard',
          '<:leese:1457834970486800567> `remove <user>` - Unban a user from the leaderboard',
          '<:leese:1457834970486800567> `list` - List all banned users',
          '<:tree:1457808523986731008> `check <user>` - Check if a user is banned',
          '',
          '**Note:** Banned users will not appear on the economy leaderboard regardless of their balance.',
          '',
          '**Aliases:** `leaderboardban`, `lbb`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    // List banned users
    if (subcommand === 'list') {
      const bannedUsers = dbHelpers.getLeaderboardBannedUsers();
      
      if (bannedUsers.size === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:arrows:1457808531678957784> No users are currently banned from the leaderboard.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const bannedList = Array.from(bannedUsers);
      const entries = [];
      
      for (let i = 0; i < Math.min(bannedList.length, 20); i++) {
        const userId = bannedList[i];
        try {
          const user = await message.client.users.fetch(userId).catch(() => null);
          const display = user ? `${user.tag} (${userId})` : `Unknown User (${userId})`;
          entries.push(`\`${i + 1}\`. ${display}`);
        } catch (error) {
          entries.push(`\`${i + 1}\`. Unknown User (${userId})`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('<:settings:1457808572720087266> Leaderboard Banned Users')
        .setDescription(entries.join('\n'))
        .setFooter({ text: `Total: ${bannedUsers.size} user${bannedUsers.size !== 1 ? 's' : ''}` });

      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    }

    // Add or remove require a user argument
    if (subcommand === 'add' || subcommand === 'remove' || subcommand === 'check') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}lbban ${subcommand} <user>\`\`\``,
                '-# <:arrows:1457808531678957784> Provide a user mention, ID, username, or tag.',
                '',
                `**Example:** \`${prefix}lbban ${subcommand} @user\``,
                `**Example:** \`${prefix}lbban ${subcommand} 123456789012345678\``,
                '',
                '**Aliases:** `leaderboardban`, `lbb`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const userInput = args.slice(1).join(' ');
      let targetUser = null;

      try {
        if (!getUser || typeof getUser !== 'function') {
          // Fallback to basic user fetching
          const mention = message.mentions.users.first();
          if (mention) {
            targetUser = mention;
          } else if (/^\d{17,19}$/.test(userInput)) {
            targetUser = await message.client.users.fetch(userInput);
          } else {
            return message.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Could not find user. Please provide a user mention or ID.')
              ],
              allowedMentions: { repliedUser: false }
            });
          }
        } else {
          targetUser = await getUser(message, userInput);
        }
      } catch (error) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Could not find user. Please provide a user mention or ID.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (!targetUser) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Could not find user. Please provide a user mention or ID.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if user is banned
      if (subcommand === 'check') {
        const isBanned = dbHelpers.isLeaderboardBanned(targetUser.id);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(isBanned
                ? `<:check:1457808518848581858> <:arrows:1457808531678957784> ${targetUser.tag} is **banned** from the leaderboard.`
                : `<:arrows:1457808531678957784> ${targetUser.tag} is **not banned** from the leaderboard.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Add ban
      if (subcommand === 'add') {
        const isAlreadyBanned = dbHelpers.isLeaderboardBanned(targetUser.id);
        
        if (isAlreadyBanned) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:arrows:1457808531678957784> ${targetUser.tag} is already **banned** from the leaderboard.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        dbHelpers.addLeaderboardBan(targetUser.id);
        
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> ${targetUser.tag} has been **banned** from the leaderboard.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Remove ban
      if (subcommand === 'remove') {
        const isBanned = dbHelpers.isLeaderboardBanned(targetUser.id);
        
        if (!isBanned) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:arrows:1457808531678957784> ${targetUser.tag} is not banned from the leaderboard.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        }

        dbHelpers.removeLeaderboardBan(targetUser.id);
        
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> ${targetUser.tag} has been **unbanned** from the leaderboard.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    // Invalid subcommand
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. Use `add`, `remove`, `list`, or `check`.')
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};

