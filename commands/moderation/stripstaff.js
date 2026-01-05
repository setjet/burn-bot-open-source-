const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'stripstaff',
  aliases: ['ss'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Remove all staff roles from a user.',
  async execute(message, args, { getUser, prefix }) {
    
    const errorEmbed = (description) => {
      return new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`${description}`);
    };

    
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ 
        embeds: [errorEmbed('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to use this command.')] 
      });
    }

    
    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}stripstaff <user>\`\`\``,
              '-# <:arrows:1363099226375979058> Remove staff roles from a user.',
              '',
              `**Example:** \`${prefix}stripstaff @jet\``,
              '\n**Aliases:** `ss`'
            ].join('\n'))
        ]
      });
    }

    
    let target;
    try {
      target = await getUser(message, args[0]);
      if (!target) {
        return message.reply({ 
          embeds: [errorEmbed(`User \`${args[0]}\` not found.`)] 
        });
      }
    } catch (err) {
      console.error('Error finding user:', err);
      return message.reply({ 
        embeds: [errorEmbed('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while finding the user.')] 
      });
    }

    
    let member;
    try {
      member = await message.guild.members.fetch(target.id);
    } catch (err) {
      return message.reply({ 
        embeds: [errorEmbed('<:excl:1362858572677120252> <:arrows:1363099226375979058> User not in server or could not be fetched.')] 
      });
    }

   
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply({ 
        embeds: [errorEmbed('<:excl:1362858572677120252> <:arrows:1363099226375979058> You cannot **strip** members with **equal** or **higher roles** than you.')] 
      });
    }

    
    const botHighestRole = message.guild.members.me.roles.highest.position;
    if (member.roles.highest.position >= botHighestRole) {
      return message.reply({ 
        embeds: [errorEmbed('<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot **modify** members with roles **higher** than my **highest role**.')] 
      });
    }

   
    const staffRoles = member.roles.cache.filter(role => {
      const hasStaffPermissions = 
        role.permissions.has(PermissionFlagsBits.Administrator) ||
        role.permissions.has(PermissionFlagsBits.ManageGuild) ||
        role.permissions.has(PermissionFlagsBits.ManageRoles);
      
      return hasStaffPermissions && role.position < botHighestRole;
    });

    if (staffRoles.size === 0) {
      return message.reply({ 
        embeds: [errorEmbed(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${target.id}> has no removable **staff roles**.`)] 
      });
    }

   
    try {
      const strippedRoles = staffRoles.map(role => role.name).join(', ');
      await member.roles.remove(staffRoles, `Stripped by ${message.author.tag} (${message.author.id})`);
      
      const embedSuccess = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> <@${message.author.id}>: **Stripped the following staff roles from** <@${target.id}>: \n\`${strippedRoles}\``);

      return message.reply({ embeds: [embedSuccess] });
    } catch (error) {
      console.error('Error stripping roles:', error);
      
      let errorDescription = 'Failed to remove roles.';
      if (error.code === 50013) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> I don\'t have **permissions** to remove these roles.';
      } else if (error.code === 50001) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> I cannot modify roles **higher than my highest role**.';
      } else if (error.message.includes('Missing Permissions')) {
        errorDescription = '<:excl:1362858572677120252> <:arrows:1363099226375979058> I don\'t have **permissions** to manage these roles.';
      }

      return message.reply({ 
        embeds: [errorEmbed(errorDescription)] 
      });
    }
  }
};