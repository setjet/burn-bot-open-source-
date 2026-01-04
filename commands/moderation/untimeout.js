const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'untimeout',
  aliases: ['uto','ut'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Remove a timeout from a user.',
  async execute(message, args, { getUser, prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Moderate Members** permission to use this command.');
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Moderate Members** permission to remove timeouts.');
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}untimeout <user> (reason)\`\`\``,
              '-# <:arrows:1363099226375979058> Removes timeout out from mentioned user.',
              '',
              `**Example:** \`${prefix}untimeout oczs\``,
              '\n**Aliases:** `ut`,`uto`'
            ].join('\n'))
        ]
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [embed] });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> User not in this server.');
      return message.reply({ embeds: [embed] });
    }

    if (!member.isCommunicationDisabled()) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${target.id}> is not currently **timed out**.`);
      return message.reply({ embeds: [embed] });
    }

    if (message.member.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **untimeout** a user with **equal or higher role than you**.');
      return message.reply({ embeds: [embed] });
    }

    if (message.guild.members.me.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot **untimeout** a user with **equal or higher role to mine**.');
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await member.timeout(null, `[Untimeout by ${message.author.tag}] For: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Removed timeout from** <@${target.id}>`); 

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Untimeout error:', error);
      let errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to remove timeout.';
      
      if (error.code === 50013) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Bot **lacks permission**s to remove **timeout**.';
      } else if (error.code === 50001) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Bot **cannot modify** users with **higher roles**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      await message.reply({ embeds: [embed] });
    }
  }
};