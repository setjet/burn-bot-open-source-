const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  aliases: ['k'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784>  Kick a user from the server.',
  async execute(message, args, { getUser, prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Kick Members** permissions to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Kick Members** permissions to kick users.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}kick <user> (reason)\`\`\``,
              '-# <:arrows:1457808531678957784> Kicks a user from the server.',
              '',
              `**Example:** \`${prefix}kick @luca spamming\``,
              '\n**Aliases:** `k`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:cr0ss:1362851089761833110> <:arrows:1457808531678957784> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === "1331687851024191499") {
      return message.react("☠️");
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1457808531678957784> User is not in the **server**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === message.author.id) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1457808531678957784> You cannot **kick** yourself.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:cr0ss:1362851089761833110> <:arrows:1457808531678957784> You cannot **kick** the **server owner**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot **kick** a user with a **higher or equal role to mine**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **kick** a user with a **higher or equal role than yourself**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const reason = args.slice(1).join(' ') || 'No reason';

    try {
      await member.kick(`[Kicked by ${message.author.tag}] for: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Successfully Kicked** <@${target.id}>`)

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('Kick error:', err);
      let errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to **kick** the user.';
      
      if (err.code === 50013) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I **lack permissions** to **kick** this user.';
      } else if (err.code === 50001) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot interact with users **with higher roles than mine**.';
      }
      
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};
