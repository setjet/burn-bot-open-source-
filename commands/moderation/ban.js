const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ban',
  aliases: ['b'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Bans a user from the server.',
  async execute(message, args, { getUser, prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Ban Members** permissions to use this command.');
      return message.reply({ embeds: [embed] });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Ban Members** permissions to ban users.');
      return message.reply({ embeds: [embed] });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}ban <user> (reason)\`\`\``,
              '-# <:arrows:1363099226375979058> Bans the mentioned user.',
              '',
              `**Example:** \`${prefix}ban @jet loser\``,
              '\n**Aliases:** `b`'
            ].join('\n'))
        ]
      });
    }

    const target = await getUser(message, args[0]);

    if (!target || !target.id || isNaN(target.id)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [embed] });
    }

    if (target.id === "1331687851024191499") {
      return message.react("☠️");
    }

    if (target.id === message.author.id) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot ban **yourself**.');
      return message.reply({ embeds: [embed] });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> User is not in the server.');
      return message.reply({ embeds: [embed] });
    }

    if (target.id === message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **ban** the **server owner**.');
      return message.reply({ embeds: [embed] });
    }

    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot **ban** a user with a **higher or equal role to mine**.');
      return message.reply({ embeds: [embed] });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **ban** a user with a **higher or equal role than yourself**.');
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(' ') || 'No reason';

    try {
      await message.guild.bans.create(target.id, {
        reason: `[BANNED by ${message.author.tag}] for: ${reason}`,
        deleteMessageSeconds: 604800
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Successfully Banned** <@${target.id}>`)


      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Ban error:', err);
      let errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Failed to ban the user**.';

      if (err.code === 50013) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> I **lack permissions** to **ban** this user.';
      } else if (err.code === 50001) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot interact with users **with higher roles than mine**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      await message.reply({ embeds: [embed] });
    }
  }
};
