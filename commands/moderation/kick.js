const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  aliases: ['k'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058>  Kick a user from the server.',
  async execute(message, args, { getUser, prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Kick Members** permissions to use this command.');
      return message.reply({ embeds: [embed] });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Kick Members** permissions to kick users.');
      return message.reply({ embeds: [embed] });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}kick <user> (reason)\`\`\``,
              '-# <:arrows:1363099226375979058> Kicks a user from the server.',
              '',
              `**Example:** \`${prefix}kick @jet spamming\``,
              '\n**Aliases:** `k`'
            ].join('\n'))
        ]
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:cr0ss:1362851089761833110> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [embed] });
    }

    if (target.id === "1331687851024191499") {
      return message.react("☠️");
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1363099226375979058> User is not in the **server**.');
      return message.reply({ embeds: [embed] });
    }

    if (target.id === message.author.id) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1363099226375979058> You cannot **kick** yourself.');
      return message.reply({ embeds: [embed] });
    }

    if (target.id === message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1363099226375979058> You cannot **kick** the **server owner**.');
      return message.reply({ embeds: [embed] });
    }

    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot **kick** a user with a **higher or equal role to mine**.');
      return message.reply({ embeds: [embed] });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **kick** a user with a **higher or equal role than yourself**.');
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(' ') || 'No reason';

    try {
      await member.kick(`[Kicked by ${message.author.tag}] for: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Successfully Kicked** <@${target.id}>`)

      await message.reply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to **kick** the user.');
      await message.reply({ embeds: [embed] });
    }
  }
};
