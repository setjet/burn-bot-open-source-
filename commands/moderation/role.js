const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Rate limit queue for role operations per guild
const roleOperationQueues = new Map();
const ROLE_OPERATION_DELAY = 1200; // 1.2 second delay between role operations per guild

async function queueRoleOperation(guildId, operation) {
  return new Promise((resolve, reject) => {
    if (!roleOperationQueues.has(guildId)) {
      roleOperationQueues.set(guildId, {
        queue: [],
        processing: false,
        lastOperation: 0
      });
    }

    const queue = roleOperationQueues.get(guildId);
    queue.queue.push({ operation, resolve, reject });

    if (!queue.processing) {
      processRoleQueue(guildId);
    }
  });
}

async function processRoleQueue(guildId) {
  const queue = roleOperationQueues.get(guildId);
  if (!queue || queue.queue.length === 0) {
    if (queue) queue.processing = false;
    return;
  }

  queue.processing = true;
  const now = Date.now();
  const timeSinceLastOp = now - queue.lastOperation;
  
  // Wait if we're too close to the last operation
  if (timeSinceLastOp < ROLE_OPERATION_DELAY) {
    await new Promise(resolve => setTimeout(resolve, ROLE_OPERATION_DELAY - timeSinceLastOp));
  }

  const { operation, resolve, reject } = queue.queue.shift();
  queue.lastOperation = Date.now();

  try {
    const result = await operation();
    resolve(result);
  } catch (error) {
    reject(error);
  }
  
  // Process next item in queue after delay
  setTimeout(() => processRoleQueue(guildId), ROLE_OPERATION_DELAY);
}

async function handleRoleCreate(message, args, prefix) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Roles** permissions to create roles.')
      ]
    });
  }

  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Manage Roles** permissions to create roles.')
      ]
    });
  }

  if (!args.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a role name.\n\`\`\`${prefix}role create <name>\`\`\``)
      ]
    });
  }

  const roleName = args.join(' ');

  try {
    await queueRoleOperation(message.guild.id, async () => {
      await message.guild.roles.create({
        name: roleName,
        reason: `Role created by ${message.author.tag}`
      });
    });

    const createdRole = message.guild.roles.cache.find(r => r.name === roleName);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:add:1362880336567992330> <:arrows:1363099226375979058> **Created** role <@&${createdRole.id}>`)
      ]
    });
  } catch (error) {
    console.error('Error creating role:', error);
    
    if (error.code === 429 || error.message?.includes('rate limit')) {
      const retryAfter = error.retryAfter || error.retry_after || 30;
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Rate Limited** - Please wait **${retryAfter}** seconds before trying again.`)
        ]
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while creating the role. Please try again.')
      ]
    });
  }
}

async function handleRoleDelete(message, args, prefix) {
  if (!args.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a role to delete.\n\`\`\`${prefix}role delete <role>\`\`\``)
      ]
    });
  }

  const roleInput = args.join(' ');
  let role;

  if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
    const roleId = roleInput.slice(3, -1);
    role = message.guild.roles.cache.get(roleId);
  } else if (/^\d{17,19}$/.test(roleInput)) {
    role = message.guild.roles.cache.get(roleInput);
  } else {
    role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleInput.toLowerCase()));
  }

  if (!role) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Role \`${roleInput}\` not found.`)
      ]
    });
  }

  if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> I can't **delete** <@&${role.id}> because it's **higher or equal to my highest role.**`)
      ]
    });
  }

  if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> You **can't delete** <@&${role.id}> because it's **higher or equal to your highest role.**`)
      ]
    });
  }

  if (role.managed) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> I can't delete **bot** or **integration** managed roles.`)
      ]
    });
  }

  try {
    await queueRoleOperation(message.guild.id, async () => {
      await role.delete(`Role deleted by ${message.author.tag}`);
    });

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:minus:1362880360056361061> <:arrows:1363099226375979058> **Deleted** role \`${role.name}\``)
      ]
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    
    if (error.code === 429 || error.message?.includes('rate limit')) {
      const retryAfter = error.retryAfter || error.retry_after || 30;
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Rate Limited** - Please wait **${retryAfter}** seconds before trying again.`)
        ]
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while deleting the role. Please try again.')
      ]
    });
  }
}

module.exports = {
  name: 'role',
  aliases: ['r'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> give or remove a role from a user.',
  async execute(message, args, { getUser, prefix }) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Roles** permissions to use this command.')
        ]
      });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Manage Roles** permissions to manage roles.')
        ]
      });
    }

    // Handle subcommands
    const subcommand = args[0]?.toLowerCase();
    
    if (subcommand === 'create') {
      return handleRoleCreate(message, args.slice(1), prefix);
    }
    
    if (subcommand === 'delete' || subcommand === 'remove') {
      return handleRoleDelete(message, args.slice(1), prefix);
    }

    // Original functionality: add/remove role from user
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}role <user> <role>\`\`\``,
              `\`\`\`${prefix}role create <name>\`\`\``,
              `\`\`\`${prefix}role delete <role>\`\`\``,
              '-# <:arrows:1363099226375979058> Gives or removes a role from a user, or creates/deletes roles.',
              '',
              `**Examples:**`,
              `\`${prefix}role @jet owner\``,
              `\`${prefix}role create fire\``,
              `\`${prefix}role delete @role\``,
              '\n**Aliases:** `r`'
            ].join('\n'))
        ]
      });
    }
    


    const targetInput = args[0];
    let target = await getUser(message, targetInput);
    

    if (!target) {
      // Try to find in cache first to avoid expensive fetch
      const cachedMember = message.guild.members.cache.find(m => 
        m.displayName.toLowerCase().includes(targetInput.toLowerCase()) ||
        m.user.username.toLowerCase().includes(targetInput.toLowerCase())
      );
      target = cachedMember?.user;
    }

    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`)
        ]
      });
    }

    // Use cache first, only fetch if not in cache
    let member = message.guild.members.cache.get(target.id);
    if (!member) {
      member = await message.guild.members.fetch(target.id).catch(() => null);
    }
    if (!member) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> User not in server.')
        ]
      });
    }

    const roleInput = args.slice(1).join(' ');
    let role;

  
    if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
      const roleId = roleInput.slice(3, -1);
      role = message.guild.roles.cache.get(roleId);
    } 
   
    else if (/^\d{17,19}$/.test(roleInput)) {
      role = message.guild.roles.cache.get(roleInput);
    }
  
    else {
      role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleInput.toLowerCase()));
    }

    if (!role) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Role \`${roleInput}\` not found.`)
        ]
      });
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> I can't **manage** <@&${role.id}> because it's **higher or equal to my highest role.**`)
        ]
      });
    }

    if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')  
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> You **can't manage** <@&${role.id}> because it's **higher or equal to your highest role.**`)
        ]
      });
    }

    const hasRole = member.roles.cache.has(role.id);

    // Send initial response to show command is processing
    const processingMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:arrows:1363099226375979058> Processing role operation...')
      ]
    }).catch(() => null);

    try {
      await queueRoleOperation(message.guild.id, async () => {
        if (hasRole) {
          await member.roles.remove(role, `Role removed by ${message.author.tag}`);
        } else {
          await member.roles.add(role, `Role added by ${message.author.tag}`);
        }
      });

      // Update or send success message
      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(
          hasRole
            ? `<:minus:1362880360056361061> <:arrows:1363099226375979058> **Removed** <@&${role.id}> **from** <@${target.id}>`
            : `<:add:1362880336567992330> <:arrows:1363099226375979058> **Added** <@&${role.id}> **to** <@${target.id}>`
        );

      if (processingMsg) {
        await processingMsg.edit({ embeds: [successEmbed] }).catch(() => {
          message.channel.send({ embeds: [successEmbed] }).catch(() => {});
        });
      } else {
        await message.reply({ embeds: [successEmbed] }).catch(() => {});
      }
    } catch (error) {
      console.error('Error in role command:', error);
      
      // Handle rate limit errors specifically
      if (error.code === 429 || error.message?.includes('rate limit')) {
        const retryAfter = error.retryAfter || error.retry_after || 30;
        const errorEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Rate Limited** - Please wait **${retryAfter}** seconds before trying again.`);
        
        if (processingMsg) {
          await processingMsg.edit({ embeds: [errorEmbed] }).catch(() => {
            message.channel.send({ embeds: [errorEmbed] }).catch(() => {});
          });
        } else {
          await message.reply({ embeds: [errorEmbed] }).catch(() => {});
        }
        return;
      }
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while modifying roles. Please try again.');
      
      if (processingMsg) {
        await processingMsg.edit({ embeds: [errorEmbed] }).catch(() => {
          message.channel.send({ embeds: [errorEmbed] }).catch(() => {});
        });
      } else {
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  }
};