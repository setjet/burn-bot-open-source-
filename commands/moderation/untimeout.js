const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'untimeout',
  aliases: ['uto','ut'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Remove a timeout from a user.',
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
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Moderate Members** permission to remove timeouts.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}untimeout <user> (reason)\`\`\``,
              '-# <:arrows:1457808531678957784> Removes timeout out from mentioned user.',
              '',
              `**Example:** \`${prefix}untimeout @jet\``,
              '\n**Aliases:** `ut`,`uto`'
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

    if (!member.isCommunicationDisabled()) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${target.id}> is not currently **timed out**.`);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (message.member.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **untimeout** a user with **equal or higher role than you**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (message.guild.members.me.roles.highest.position <= member.roles.highest.position) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot **untimeout** a user with **equal or higher role to mine**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await member.timeout(null, `[Untimeout by ${message.author.tag}] For: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Removed timeout from** <@${target.id}>`); 

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Untimeout error:', error);
      let errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to remove timeout.';
      
      if (error.code === 50013) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Bot **lacks permission**s to remove **timeout**.';
      } else if (error.code === 50001) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Bot **cannot modify** users with **higher roles**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};