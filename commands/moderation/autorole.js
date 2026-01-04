const { EmbedBuilder, PermissionsBitField, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../storedata.json');

// Load autoroles from storedata.json
function loadAutoRoles() {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return new Map(Object.entries(data.autoroles || {}));
    }
  } catch (err) {
    console.error('Error loading autoroles:', err);
  }
  return new Map();
}

// Save autoroles to storedata.json
function saveAutoRoles(autoRoles) {
  try {
    let data = {};
    if (fs.existsSync(storePath)) {
      data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
    data.autoroles = Object.fromEntries(autoRoles);
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving autoroles:', err);
  }
}

const serverAutoRoles = loadAutoRoles();


const MODERATOR_PERMISSIONS = [
  PermissionsBitField.Flags.Administrator,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageWebhooks,
  PermissionsBitField.Flags.ManageEmojisAndStickers,
  PermissionsBitField.Flags.ModerateMembers,
  PermissionsBitField.Flags.ViewAuditLog,
  PermissionsBitField.Flags.ViewGuildInsights
];

module.exports = {
  name: 'autorole',
  category: 'moderation',
  description: '<:arrows:1363099226375979058> Manage the server\'s autorole.',
  async execute(message, args, { client, prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Guild** permissions to use this command.')
        ]
      });
    }

    const subcommand = args[0]?.toLowerCase();
    const roleInput = args[1];
    const guildId = message.guild.id;

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}autorole (subcommand) (args)\`\`\``,
            '-# <:arrows:1363099226375979058> Use `set` to add an autorole, `remove` to remove it, or `view` to see list.',
            '',
            '**Aliases:** `N/A`'
        ].join('\n'));

      return message.reply({ embeds: [usageEmbed] });
    }

    if (subcommand === 'view') {
      const roleId = serverAutoRoles.get(guildId);
      
      if (!roleId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> This server has **no autorole** set.')
          ]
        });
      }

      const role = message.guild.roles.cache.get(roleId);
      if (!role) {
        // Clean up if role no longer exists
        serverAutoRoles.delete(guildId);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> The **autorole** was set but the role **no longer exists**. It has been **cleared**.')
          ]
        });
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:arrows:1363099226375979058> Current **autorole**: ${role.toString()}`)
        ]
      });
    }

    if (subcommand === 'remove') {
      if (!serverAutoRoles.has(guildId)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> This server has **no autorole** to remove.')
          ]
        });
      }

      serverAutoRoles.delete(guildId);
      saveAutoRoles(serverAutoRoles);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:deleted:1363170791457427546> <:arrows:1363099226375979058> **Removed** the server\'s **autorole**.')
        ]
      });
    }

    if (subcommand === 'set') {
      if (!roleInput) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Mention a **role** or provide a **role ID**.')
          ]
        });
      }

      const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleInput);
      if (!role) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Mention a **valid role** or provide a **valid role ID**.')
          ]
        });
      }

      // Check if bot can manage the role
      const botMember = await message.guild.members.fetchMe();
      if (role.position >= botMember.roles.highest.position) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> I can't assign the ${role.toString()} role because it's **higher than my highest role**.`)
          ]
        });
      }

      if (role.managed) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I can\'t assign **bot** or **integration** managed roles.')
          ]
        });
      }

      // Check for dangerous permissions
      const dangerousPermissions = MODERATOR_PERMISSIONS.filter(perm => role.permissions.has(perm));
      if (dangerousPermissions.length > 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Cannot set ${role.toString()} as **autorole** because it has **moderator permissions**.`)
          ]
        });
      }

      const currentRoleId = serverAutoRoles.get(guildId);
      if (currentRoleId) {
        const currentRole = message.guild.roles.cache.get(currentRoleId);
        if (currentRole) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> An **autorole** (${currentRole.toString()}) has already been set. **Remove** it first before setting a new one.`)
            ]
          });
        } else {
    
          serverAutoRoles.delete(guildId);
        }
      }

      serverAutoRoles.set(guildId, role.id);
      saveAutoRoles(serverAutoRoles);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Set** ${role.toString()} as the server's **autorole**.`)
        ]
      });
    }

  
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid **subcommand**. Use `set`, `remove`, or `view`.')
      ]
    });
  },


  getAutorole: (guildId) => {
    return serverAutoRoles.get(guildId);
  },


  setup: (client) => {
    client.on(Events.GuildMemberAdd, async (member) => {
      const roleId = serverAutoRoles.get(member.guild.id);
      if (!roleId) return;

      const role = member.guild.roles.cache.get(roleId);
      if (!role) {
    
        serverAutoRoles.delete(member.guild.id);
        return;
      }

      try {
        await member.roles.add(role);
        
      } catch (error) {
        
      }
    });
  }
};