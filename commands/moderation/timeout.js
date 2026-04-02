const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// parsing "10m" vs "10 minutes" vs typos — humanity's worst input format 😭

module.exports = {
  name: 'timeout',
  aliases: ['to'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Timeout a user in the server.',
  async execute(message, args, { getUser, prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Moderate Members** permission to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Moderate Members** permission to timeout users.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}timeout <user> (reason)\`\`\``,
              '-# <:arrows:1457808531678957784> Times out the mentioned user.',
              '',
              `**Example:** \`${prefix}timeout @luca lame\``,
              '\n**Aliases:** `to`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }


    const target = await getUser(message, args[0]);
    if (!target) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }


    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not in this server.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    
    if (message.member.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **timeout** someone with **equal or higher role than you**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (message.guild.members.me.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot timeout someone with **equal or higher role than me**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }


    if (member.id === message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **timeout** the **server owner**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }


    if (member.user.bot) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot timeout **bots**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }


    let durationMs;
    const durationInput = args[1]?.toLowerCase();
    
    if (!durationInput) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please specify a duration **(e.g., 10m, 1h, 2d)**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
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
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid duration. Must be between **1 minute** and **28 days**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
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
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784>  **Timed out** <@${target.id}> for **${durationDisplay}**`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Timeout error:', error);
      let errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to timeout user.';
      
      if (error.code === 50013) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Bot **lacks permission**s to **timeout** this user.';
      } else if (error.code === 50001) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Bot cannot **timeout** users with **higher roles**.';
      } else if (error.message.includes('MAXIMUM_TIMEOUT_DURATION')) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Timeout** duration exceeds maximum limit **(28 days)**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};