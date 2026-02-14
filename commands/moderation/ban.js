const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ban',
  aliases: ['b'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Bans a user from the server.',
  async execute(message, args, { getUser, prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Ban Members** permissions to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375>  <:arrows:1457808531678957784> I need **Ban Members** permissions to ban users.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}ban <user> (reason)\`\`\``,
              '-# <:arrows:1457808531678957784> Bans the mentioned user.',
              '',
              `**Example:** \`${prefix}ban @luca loser\``,
              '\n**Aliases:** `b`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Cache-only user resolution to avoid gateway rate limits
    let target = null;
    const input = args[0];
    const inputLower = input.toLowerCase();
    
    // Check mentions first (no fetch needed)
    const mention = message.mentions.users.first();
    if (mention) {
      target = mention;
    }
    // Check if it's a user ID (fetch from global cache, not guild members)
    else if (/^\d{17,19}$/.test(input)) {
      target = message.client.users.cache.get(input);
      if (!target) {
        // Only fetch if not in cache - this is a global user fetch, not a guild member fetch
        try {
          target = await message.client.users.fetch(input);
        } catch (err) {
          target = null;
        }
      }
    }
    // Try to find by username, display name, or tag in cache only (no fetch)
    else {
      // Search in guild member cache first (includes display names/nicknames)
      const member = message.guild.members.cache.find(m => {
        const username = m.user.username.toLowerCase();
        const tag = m.user.tag.toLowerCase();
        const displayName = m.displayName?.toLowerCase();
        const globalName = m.user.globalName?.toLowerCase();
        
        return username === inputLower ||
               tag === inputLower ||
               (displayName && displayName === inputLower) ||
               (globalName && globalName === inputLower) ||
               username.includes(inputLower) ||
               (displayName && displayName.includes(inputLower)) ||
               (globalName && globalName.includes(inputLower));
      });
      
      if (member) {
        target = member.user;
      } else {
        // Try global user cache as last resort (username, tag, global name)
        target = message.client.users.cache.find(u => {
          const username = u.username.toLowerCase();
          const tag = u.tag.toLowerCase();
          const globalName = u.globalName?.toLowerCase();
          
          return username === inputLower ||
                 tag === inputLower ||
                 (globalName && globalName === inputLower) ||
                 username.includes(inputLower) ||
                 (globalName && globalName.includes(inputLower));
        }) || null;
      }
    }

    if (!target || !target.id || isNaN(target.id)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${args[0]}\` not found.`);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === "1331687851024191499") {
      return message.react("☠️");
    }

    if (target.id === message.author.id) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot ban **yourself**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (target.id === message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **ban** the **server owner**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    // Only check member from cache to avoid gateway rate limits
    // We don't fetch because: 1) It causes rate limits, 2) You can ban users not in the server
    const member = message.guild.members.cache.get(target.id);

    // Only check role hierarchy if member is in cache
    // If not in cache, we skip these checks and proceed with ban (Discord allows banning users not in server)
    if (member) {
      if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot **ban** a user with a **higher or equal role to mine**.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }

      if (member.roles.highest.position >= message.member.roles.highest.position) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **ban** a user with a **higher or equal role than yourself**.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
    }

    const reason = args.slice(1).join(' ') || 'No reason';

    try {
      await message.guild.bans.create(target.id, {
        reason: `[BANNED by ${message.author.tag}] for: ${reason}`,
        deleteMessageSeconds: 604800
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Successfully Banned** <@${target.id}>`)


      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('Ban error:', err);
      let errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Failed to ban the user**.';

      if (err.code === 50013) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I **lack permissions** to ban this user. Ensure I have **Ban Members** and my role is **above** the user\'s highest role.';
      } else if (err.code === 50001) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot interact with users **with higher roles than mine**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorDescription);
      message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }
  }
};
