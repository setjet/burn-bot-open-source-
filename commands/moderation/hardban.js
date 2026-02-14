const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'hardban',
  aliases: ['hb'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784>  Permanently ban a user from the server.',
  async execute(message, args, { getUser, prefix }) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to use this command.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}hardban <user> (reason)\`\`\``,
              '-# <:arrows:1457808531678957784> Keeps a user banned **permanently**.',
              '',
              `**Example:** \`${prefix}hardban @luca retard\``,
              '\n**Aliases:** `hb`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${args[0]}\` not found.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

   
    if (target.id === "1359821076984758292") {
      return message.react("☠️");
    }

    if (target.id === message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **hardban yourself**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (target.id === message.guild.ownerId) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **hardban** the **server owner**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);

    if (member) {
      if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **hardban** a user with a **higher or equal role than yourself.**')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot **hardban** a user with a **higher or equal role to mine**')
          ],
          allowedMentions: { repliedUser: false }
        });
      }
    }

    const banned = await message.guild.bans.fetch().catch(() => new Map());
    if (banned.has(target.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> \`${target.tag}\` is already banned.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      const guildId = message.guild.id;

      // Check if already hardbanned
      const hardbannedUsers = dbHelpers.getHardbannedUsers(guildId);
      if (!hardbannedUsers.includes(target.id)) {
        dbHelpers.addHardbannedUser(guildId, target.id);
      }

      await message.guild.bans.create(target.id, {
        reason: `[HARDBANNED by ${message.author.tag}] for: ${reason}`,
        deleteMessageSeconds: 604800
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Successfully Hardbanned** <@${target.id}>`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Error in hardban command:', error);
      let errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while banning the user.';
      
      if (error.code === 50013) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I **lack permissions** to **ban** this user.';
      } else if (error.code === 50001) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot interact with users **with higher roles than mine**.';
      } else if (error.code === 50035) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid form body or ban reason too long.';
      }
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(errorDescription)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};