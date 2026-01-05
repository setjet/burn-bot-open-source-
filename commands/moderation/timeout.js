const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'timeout',
  aliases: ['to'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Timeout a user in the server.',
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
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Moderate Members** permission to timeout users.');
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}timeout <user> (reason)\`\`\``,
              '-# <:arrows:1363099226375979058> Times out the mentioned user.',
              '',
              `**Example:** \`${prefix}timeout @jet lame\``,
              '\n**Aliases:** `to`'
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

    
    if (message.member.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **timeout** someone with **equal or higher role than you**.');
      return message.reply({ embeds: [embed] });
    }

    if (message.guild.members.me.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot timeout someone with **equal or higher role than me**.');
      return message.reply({ embeds: [embed] });
    }


    if (member.id === message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **timeout** the **server owner**.');
      return message.reply({ embeds: [embed] });
    }


    if (member.user.bot) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot timeout **bots**.');
      return message.reply({ embeds: [embed] });
    }


    let durationMs;
    const durationInput = args[1]?.toLowerCase();
    
    if (!durationInput) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Please specify a duration **(e.g., 10m, 1h, 2d)**.');
      return message.reply({ embeds: [embed] });
    }

    if (durationInput.endsWith('d')) {
      const days = parseInt(durationInput);
      durationMs = days * 24 * 60 * 60 * 1000;
    } else if (durationInput.endsWith('h')) {
      const hours = parseInt(durationInput);
      durationMs = hours * 60 * 60 * 1000;
    } else {
      const minutes = parseInt(durationInput);
      durationMs = minutes * 60 * 1000;
    }

    if (isNaN(durationMs) || durationMs < 60000 || durationMs > 2419200000) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid duration. Must be between **1 minute** and **28 days**.');
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      await member.timeout(durationMs, `[Timed out by ${message.author.tag}] For: ${reason}`);

      let durationDisplay;
      if (durationMs >= 86400000) {
        durationDisplay = `${Math.round(durationMs / 86400000)} day(s)`;
      } else if (durationMs >= 3600000) {
        durationDisplay = `${Math.round(durationMs / 3600000)} hour(s)`;
      } else {
        durationDisplay = `${Math.round(durationMs / 60000)} minute(s)`;
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058>  **Timed out** <@${target.id}> for **${durationDisplay}**`);

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Timeout error:', error);
      let errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to timeout user.';
      
      if (error.code === 50013) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Bot **lacks permission**s to **timeout** this user.';
      } else if (error.code === 50001) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> Bot cannot **timeout** users with **higher roles**.';
      } else if (error.message.includes('MAXIMUM_TIMEOUT_DURATION')) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Timeout** duration exceeds maximum limit **(28 days)**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      await message.reply({ embeds: [embed] });
    }
  }
};