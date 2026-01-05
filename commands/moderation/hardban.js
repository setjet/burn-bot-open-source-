const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'hardban',
  aliases: ['hb'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058>  Permanently ban a user from the server.',
  async execute(message, args, { getUser, prefix }) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to use this command.')
        ]
      });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}hardban <user> (reason)\`\`\``,
              '-# <:arrows:1363099226375979058> Keeps a user banned permanently.',
              '',
              `**Example:** \`${prefix}hardban @jet retard\``,
              '\n**Aliases:** `hb`'
            ].join('\n'))
        ]
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`)
        ]
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
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **hardban yourself**.')
        ]
      });
    }

    if (target.id === message.guild.ownerId) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **hardban** the **server owner**.')
        ]
      });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);

    if (member) {
      if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **hardban** a user with a **higher or equal role than yourself.**')
          ]
        });
      }

      if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot **hardban** a user with a **higher or equal role to mine**')
          ]
        });
      }
    }

    const banned = await message.guild.bans.fetch().catch(() => new Map());
    if (banned.has(target.id)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> \`${target.tag}\` is already banned.`)
        ]
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
        .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Successfully Hardbanned** <@${target.id}>`);

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in hardban command:', error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while banning the user.')
        ]
      });
    }
  }
};