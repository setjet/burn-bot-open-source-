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
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Roles** permissions to create roles.')
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Roles** permissions to create roles.')
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  if (!args.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a role name.\n\`\`\`${prefix}role create <name>\`\`\``)
      ],
      allowedMentions: { repliedUser: false }
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
          .setDescription(`<:add:1457809450495905845> <:arrows:1457808531678957784> **Created** role <@&${createdRole.id}>`)
      ],
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    console.error('Error creating role:', error);
    
    if (error.code === 429 || error.message?.includes('rate limit')) {
      const retryAfter = error.retryAfter || error.retry_after || 30;
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Rate Limited** - Please wait **${retryAfter}** seconds before trying again.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while creating the role. Please try again.')
      ],
      allowedMentions: { repliedUser: false }
    });
  }
}

async function handleRoleDelete(message, args, prefix) {
  if (!args.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a role to delete.\n\`\`\`${prefix}role delete <role>\`\`\``)
      ],
      allowedMentions: { repliedUser: false }
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
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Role \`${roleInput}\` not found.`)
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I can't **delete** <@&${role.id}> because it's **higher or equal to my highest role.**`)
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You **can't delete** <@&${role.id}> because it's **higher or equal to your highest role.**`)
      ],
      allowedMentions: { repliedUser: false }
    });
  }

  if (role.managed) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I can't delete **bot** or **integration** managed roles.`)
      ],
      allowedMentions: { repliedUser: false }
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
          .setDescription(`<:deleted:1457808575316492309> <:arrows:1457808531678957784> **Deleted** role \`${role.name}\``)
      ],
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    
    if (error.code === 429 || error.message?.includes('rate limit')) {
      const retryAfter = error.retryAfter || error.retry_after || 30;
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Rate Limited** - Please wait **${retryAfter}** seconds before trying again.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while deleting the role. Please try again.')
      ],
      allowedMentions: { repliedUser: false }
    });
  }
}

module.exports = {
  name: 'role',
  aliases: ['r'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> give or remove a role from a user.',
  async execute(message, args, { getUser, prefix }) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Roles** permissions to use this command.')
      ],
      allowedMentions: { repliedUser: false }
    });
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Roles** permissions to manage roles.')
      ],
      allowedMentions: { repliedUser: false }
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
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}role (subcommand) (args)\`\`\``,
              '-# <:arrows:1457808531678957784> **__Subcommands__**',
              '<:leese:1457834970486800567> `<user>` to give/remove a role',
              '<:leese:1457834970486800567> `create` to create a role',
              '<:tree:1457808523986731008> `delete` to delete a role',
              '\n**Aliases:** `r`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    


    const targetInput = args[0];
    const target = await getUser(message, targetInput);

    if (!target) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${args[0]}\` not found.`)
      ],
      allowedMentions: { repliedUser: false }
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
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not in server.')
        ],
        allowedMentions: { repliedUser: false }
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
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Role \`${roleInput}\` not found.`)
      ],
      allowedMentions: { repliedUser: false }
    });
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I can't **manage** <@&${role.id}> because it's **higher or equal to my highest role.**`)
      ],
      allowedMentions: { repliedUser: false }
    });
    }

    if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')  
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You **can't manage** <@&${role.id}> because it's **higher or equal to your highest role.**`)
      ],
      allowedMentions: { repliedUser: false }
    });
    }

    const hasRole = member.roles.cache.has(role.id);

    // Send initial response to show command is processing
    const processingMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<a:loading:1458064376165564577> Processing role operation...')
      ],
      allowedMentions: { repliedUser: false }
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
            ? `<:minus:1457808539702657067> <:arrows:1457808531678957784> **Removed** <@&${role.id}> **from** <@${target.id}>`
            : `<:add:1457809450495905845> <:arrows:1457808531678957784> **Added** <@&${role.id}> **to** <@${target.id}>`
        );

      if (processingMsg) {
        await processingMsg.edit({ embeds: [successEmbed] }).catch(() => {
          message.channel.send({ embeds: [successEmbed] }).catch(() => {});
        });
      } else {
        await message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
    } catch (error) {
      console.error('Error in role command:', error);
      
      // Handle rate limit errors specifically
      if (error.code === 429 || error.message?.includes('rate limit')) {
        const retryAfter = error.retryAfter || error.retry_after || 30;
        const errorEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Rate Limited** - Please wait **${retryAfter}** seconds before trying again.`);
        
        if (processingMsg) {
          await processingMsg.edit({ embeds: [errorEmbed] }).catch(() => {
            message.channel.send({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
          });
        } else {
          await message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
        }
        return;
      }
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while modifying roles. Please try again.');
      
      if (processingMsg) {
        await processingMsg.edit({ embeds: [errorEmbed] }).catch(() => {
          message.channel.send({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
        });
      } else {
        await message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
    }
  }
};