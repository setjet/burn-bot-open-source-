const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'stripstaff',
  aliases: ['ss'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Remove all staff roles from a user.',
  async execute(message, args, { getUser, prefix }) {
    
    const errorEmbed = (description) => {
      return new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`${description}`);
    };

    
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ 
        embeds: [errorEmbed('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to use this command.')],
        allowedMentions: { repliedUser: false }
      });
    }

    
    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}stripstaff <user>\`\`\``,
              '-# <:arrows:1457808531678957784> Remove roles with dangerous permissions from a user.',
              '',
              `**Example:** \`${prefix}stripstaff @luca\``,
              '\n**Aliases:** `ss`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    
    let target;
    try {
      target = await getUser(message, args[0]);
      if (!target) {
        return message.reply({ 
          embeds: [errorEmbed(`User \`${args[0]}\` not found.`)],
          allowedMentions: { repliedUser: false }
        });
      }
    } catch (err) {
      console.error('Error finding user:', err);
      return message.reply({ 
        embeds: [errorEmbed('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while finding the user.')],
        allowedMentions: { repliedUser: false }
      });
    }

    
    let member;
    try {
      member = await message.guild.members.fetch(target.id);
    } catch (err) {
      return message.reply({ 
        embeds: [errorEmbed('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not in server or could not be fetched.')],
        allowedMentions: { repliedUser: false }
      });
    }

   
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply({ 
        embeds: [errorEmbed('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You cannot **strip** members with **equal** or **higher roles** than you.')],
        allowedMentions: { repliedUser: false }
      });
    }

    
    const botHighestRole = message.guild.members.me.roles.highest.position;
    if (member.roles.highest.position >= botHighestRole) {
      return message.reply({ 
        embeds: [errorEmbed('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot **modify** members with roles **higher** than my **highest role**.')],
        allowedMentions: { repliedUser: false }
      });
    }

   
    // Define dangerous permissions that should be stripped
    const dangerousPermissions = [
      PermissionFlagsBits.Administrator,        // Full server control
      PermissionFlagsBits.ManageGuild,           // Server settings
      PermissionFlagsBits.ManageRoles,           // Role management
      PermissionFlagsBits.ManageChannels,         // Channel management
      PermissionFlagsBits.ManageMessages,         // Message management
      PermissionFlagsBits.BanMembers,             // Ban users
      PermissionFlagsBits.KickMembers,            // Kick users
      PermissionFlagsBits.ManageWebhooks,         // Webhook management
      PermissionFlagsBits.ManageEmojisAndStickers, // Emoji/sticker management
      PermissionFlagsBits.ManageEvents,           // Event management
      PermissionFlagsBits.ManageThreads,          // Thread management
      PermissionFlagsBits.ModerateMembers,        // Timeout users
      PermissionFlagsBits.ViewAuditLog,           // View audit logs
      PermissionFlagsBits.ChangeNickname,         // Change own nickname
      PermissionFlagsBits.ManageNicknames,        // Manage others' nicknames
    ];

    const staffRoles = member.roles.cache.filter(role => {
      // Skip @everyone role
      if (role.id === message.guild.id) return false;
      
      // Check if role has any dangerous permissions
      const hasDangerousPermissions = dangerousPermissions.some(perm => 
        role.permissions.has(perm)
      );
      
      // Only strip roles with dangerous permissions that the bot can manage
      return hasDangerousPermissions && role.position < botHighestRole;
    });

    if (staffRoles.size === 0) {
      return message.reply({ 
        embeds: [errorEmbed(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${target.id}> has no removable **roles with dangerous permissions**.`)],
        allowedMentions: { repliedUser: false }
      });
    }

   
    try {
      const strippedRoles = staffRoles.map(role => role.name).join(', ');
      await member.roles.remove(staffRoles, `Stripped by ${message.author.tag} (${message.author.id})`);
      
      const embedSuccess = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Stripped all **dangerous role(s)** from <@${target.id}>`)

      return message.reply({ embeds: [embedSuccess], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Error stripping roles:', error);
      
      let errorDescription = 'Failed to remove roles.';
      if (error.code === 50013) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I don\'t have **permissions** to remove these roles.';
      } else if (error.code === 50001) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot modify roles **higher than my highest role**.';
      } else if (error.message.includes('Missing Permissions')) {
        errorDescription = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I don\'t have **permissions** to manage these roles.';
      }

      return message.reply({ 
        embeds: [errorEmbed(errorDescription)],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};