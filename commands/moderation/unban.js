const { PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'unban',
  aliases: ['ub'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784>  Unban a user from the server.',
  async execute(message, args, { prefix }) {

    if (!message.guild) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This **command** can only be used in a **server**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Ban Members** permissions to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Ban Members** permissions to unban users.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}unban <user> (reason)\`\`\``,
              '-# <:arrows:1457808531678957784> Unbans the mentioned user.',
              '',
              `**Example:** \`${prefix}unban @ben goat\``,
              '\n**Aliases:** `ub`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // Extract user ID from mention, username, or use raw input
    let userId = args[0];
    if (userId.startsWith('<@') && userId.endsWith('>')) {
      userId = userId.replace(/[^0-9]/g, '');
    } else if (!/^\d+$/.test(userId)) {
      // If not a pure number, try to find by username in bans
      try {
        const bans = await message.guild.bans.fetch();
        const bannedUser = bans.find(ban => 
          ban.user.username.toLowerCase() === userId.toLowerCase() || 
          ban.user.tag.toLowerCase() === userId.toLowerCase()
        );
        
        if (!bannedUser) {
          const embed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No **banned** user found with that name. Try using **their ID**.');
          return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
        }
        userId = bannedUser.user.id;
      } catch (error) {
        console.error('Error fetching bans:', error);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Error fetching **banned** users. Try using the **user ID** instead.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
    }

    if (!userId || userId.length < 17) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a **valid** user ID **(17-18 digits)**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    try {
      const bans = await message.guild.bans.fetch();
      const banInfo = bans.find(ban => ban.user.id === userId);

      if (!banInfo) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${userId}> is not currently **banned**.`);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      const { dbHelpers } = require('../../db');
      const guildId = message.guild.id;
      const hardbannedUsers = dbHelpers.getHardbannedUsers(guildId);
      const isHardbanned = hardbannedUsers.includes(userId);

      if (isHardbanned) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          const embed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Administrator** permissions to unban **hardbanned** users.');
          return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
        }

        const confirmEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:alert:1457808529200119880> <:arrows:1457808531678957784> You're attempting to **unban** <@${userId}> who was **hardbanned**.`)
          .addFields(
            { name: '', value: '-# This action requires confirmation.' }
          ); 

        const confirmRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('confirm_unban')
              .setLabel('Yes')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('cancel_unban')
              .setLabel('No')
              .setStyle(ButtonStyle.Success)
          );

        const confirmation = await message.reply({
          embeds: [confirmEmbed],
          components: [confirmRow],
          allowedMentions: { repliedUser: false }
        }).catch(() => {});

        if (!confirmation) return;

        const filter = i => i.user.id === message.author.id;
        const collector = confirmation.createMessageComponentCollector({
          filter,
          time: 30000
        });

        collector.on('collect', async i => {
          try {
            if (i.customId === 'confirm_unban') {
              // Remove from hardbanned users in database
              dbHelpers.removeHardbannedUser(guildId, userId);

              const reason = args.slice(1).join(' ') || 'No reason provided';
              await message.guild.members.unban(userId, `Hardban removed by ${message.author.tag}: ${reason}`);
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor('#838996')
                    .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Successfully unbanned** <@${userId}>`)
                ],
                components: []
              }).catch(() => {});
            } else {
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor('#838996')
                    .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Unban** cancelled')
                ],
                components: []
              }).catch(() => {});
            }
          } catch (error) {
            console.error('Error handling unban confirmation:', error);
            await i.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred during **unban**')
              ],
              ephemeral: true
            }).catch(() => {});
          }
        });

        collector.on('end', collected => {
          if (collected.size === 0) {
            confirmation.edit({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription('<:alert:1457808529200119880> <:arrows:1457808531678957784> Confirmation **timed out**')
              ],
              components: []
            }).catch(() => {});
          }
        });
        return;
      }

      const reason = args.slice(1).join(' ') || 'No reason provided';
      await message.guild.members.unban(userId, `Unbanned by ${message.author.tag}: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Successfully unbanned** <@${userId}>`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});

    } catch (error) {
      console.error('Unban error:', error);
      let errorMessage = `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to unban user <@${userId}>.`;

      if (error.code === 50013) {
        errorMessage = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I cannot **unban** this user because they have **higher permissions than me**.';
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(errorMessage);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }
  }
};