const { EmbedBuilder, PermissionsBitField, Events } = require('discord.js');
const { dbHelpers } = require('../../db');

// big permission bitmask because "is mod" is never one flag 😭

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
  description: '<:arrows:1457808531678957784> Manage the server\'s autorole.',
  async execute(message, args, { client, prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Guild** permissions to use this command.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const subcommand = args[0]?.toLowerCase();
    const roleInput = args[1];
    const guildId = message.guild.id;

    if (!subcommand) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}autorole (subcommand) (args)\`\`\``,
            '-# <:arrows:1457808531678957784> **__Subcommands__** \n <:leese:1457834970486800567> `set` to add an autorole \n <:leese:1457834970486800567> `remove` to remove it \n <:tree:1457808523986731008>`view` to see list.',
            '',
            '**Aliases:** `N/A`'
        ].join('\n'));

      return message.reply({ 
        embeds: [usageEmbed],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'view') {
      const roleId = dbHelpers.getAutorole(guildId);
      
      if (!roleId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:cr0ss:1457809446620369098> <:arrows:1457808531678957784> This server has **no autorole** set.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const role = message.guild.roles.cache.get(roleId);
      if (!role) {
        // Clean up if role no longer exists
        dbHelpers.setAutorole(guildId, null);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1457809455268888679> <:arrows:1457808531678957784> The **autorole** was set but the role **no longer exists**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:arrows:1457808531678957784> Current **autorole**: ${role.toString()}`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'remove') {
      const roleId = dbHelpers.getAutorole(guildId);
      if (!roleId) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This server has **no autorole** to remove.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      dbHelpers.setAutorole(guildId, null);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:deleted:1457808575316492309> <:arrows:1457808531678957784> **Removed** the server\'s **autorole**.')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'set') {
      if (!roleInput) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}autorole <set> <role>\`\`\``,
              '-# <:arrows:1457808531678957784> Set the server\'s autorole.',
              '',
              `**Example:** \`${prefix}autorole set @member\``,
              '\n**Aliases:** `N/A`'
            ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
    }

      const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleInput);
      if (!role) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Mention a **valid role** or provide a **valid role ID**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check if bot can manage the role
      const botMember = await message.guild.members.fetchMe();
      if (role.position >= botMember.roles.highest.position) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I can't assign the ${role.toString()} role because it's **higher than my highest role**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      if (role.managed) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I can\'t assign **bot** or **integration** managed roles.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Check for dangerous permissions
      const dangerousPermissions = MODERATOR_PERMISSIONS.filter(perm => role.permissions.has(perm));
      if (dangerousPermissions.length > 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Cannot set ${role.toString()} as **autorole** because it has **moderator permissions**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const currentRoleId = dbHelpers.getAutorole(guildId);
      if (currentRoleId) {
        const currentRole = message.guild.roles.cache.get(currentRoleId);
        if (currentRole) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An **autorole** (${currentRole.toString()}) has already been set. \n-# <:tree:1457808523986731008> Remove it first before setting a **new role**.`)
            ],
            allowedMentions: { repliedUser: false }
          });
        } else {
          // Clean up if role no longer exists
          dbHelpers.setAutorole(guildId, null);
        }
      }

      dbHelpers.setAutorole(guildId, role.id);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Set** ${role.toString()} as the server's **autorole**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

  
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **subcommand**. Use `set`, `remove`, or `view`.')
      ],
      allowedMentions: { repliedUser: false }
    });
  },


  getAutorole: (guildId) => {
    return dbHelpers.getAutorole(guildId);
  },


  setup: (client) => {
    client.on(Events.GuildMemberAdd, async (member) => {
      const roleId = dbHelpers.getAutorole(member.guild.id);
      if (!roleId) return;

      const role = member.guild.roles.cache.get(roleId);
      if (!role) {
        // Clean up if role no longer exists
        dbHelpers.setAutorole(member.guild.id, null);
        return;
      }

      try {
        await member.roles.add(role);
        
      } catch (error) {
        
      }
    });
  }
};