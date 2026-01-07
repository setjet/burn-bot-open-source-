const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'forcenickname',
  aliases: ['fn'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Force a nickname on a user.',
  async execute(message, args, { getUser, forcedNicknames, saveData, client, prefix }) { 
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}forcenickname <user> <nickname>\`\`\``,
              '-# <:arrows:1457808531678957784> Forcefully changes a user\'s nickname.',
              '',
              `**Example:** \`${prefix}forcenickname @jet goat\``,
              '\n**Aliases:** `fn`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    

    const guildId = message.guild.id;
    let guildForcedNicknames = forcedNicknames.get(guildId);
    if (!guildForcedNicknames) {
      guildForcedNicknames = new Map();
      forcedNicknames.set(guildId, guildForcedNicknames);
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not in server');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === message.guild.ownerId) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot force a nickname for the **server owner**.');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === message.author.id) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot force a nickname on **yourself**.');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot force a nickname for a user with a **higher role than you**.');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot force a nickname for a user with a **higher role than me**.');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    const existingNickname = guildForcedNicknames.get(target.id);
    if (existingNickname) {
      guildForcedNicknames.delete(target.id); 
      if (guildForcedNicknames.size === 0) { 
        forcedNicknames.delete(guildId);
      }
      saveData();
      
      await member.setNickname(null, `Force nickname removed by ${message.author.tag}`).catch(() => {});
      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Removed forced nickname from** \`${target.tag}\``);
      return message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } });
    }

    const nickname = args.slice(1).join(' ');
    if (!nickname) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1457809455268888679> <:arrows:1457808531678957784> You need to provide a **nickname** to set.');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    if (nickname.length > 32) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1457809455268888679> <:arrows:1457808531678957784> Nickname must be **32 characters or less**');
      return message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } });
    }

    guildForcedNicknames.set(target.id, nickname);
    saveData();

    await member.setNickname(nickname, 'Forced nickname set via command').catch(() => {});

    const successEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Forced** \`${target.tag}\`'s **nickname** to \`${nickname}\``);
    return message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } });
  }
};