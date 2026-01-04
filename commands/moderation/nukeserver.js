const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'servernuke',
  aliases: ['sn'],
  category: 'moderation',
  description: '<:arrows:1363099226375979058> Completely wipe the server (owner only).',
  async execute(message, args, { prefix }) {
    if (!message.guild) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> This **command** can only be used in a **server**.');
      return message.reply({ embeds: [embed] });
    }

    // Only server owner can use this
    if (message.author.id !== message.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Only the **server owner** can use this command.');
      return message.reply({ embeds: [embed] });
    }

    // Check bot permissions
    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Administrator** permissions to nuke this server.');
      return message.reply({ embeds: [embed] });
    }

    // Show warning
    const warningEmbed = new EmbedBuilder()
      .setColor('#ff4d4d')
      .setDescription([
        `<:alert:1363009864112144394> <:arrows:1363099226375979058> **WARNING: NUKE SERVER?**`,
        '',
        `You are about to **permanently delete** everything in **${message.guild.name}**:`,
        '',
        `• All **channels**`,
        `• All **roles** (except @everyone)`,
        `• All **emojis**`, 
        `• All **stickers**`,
        `• All **webhooks**`,
        `• All **bans**`,
        '',
        '**This action cannot be reversed.**',
        '',
        '-# Type the server name below to confirm.'
      ].join('\n'));

    const confirmation = await message.reply({ embeds: [warningEmbed] }).catch(() => {});
    if (!confirmation) return;

    // Wait for server name confirmation
    const nameFilter = m => m.author.id === message.author.id;
    const nameCollector = message.channel.createMessageCollector({ filter: nameFilter, time: 30000, max: 1 });

    nameCollector.on('collect', async (m) => {
      if (m.content !== message.guild.name) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Server name **did not match**. Nuke **cancelled**.');
        return message.channel.send({ embeds: [embed] }).catch(() => {});
      }

      // Final confirmation with buttons
      const finalEmbed = new EmbedBuilder()
        .setColor('#ff4d4d')
        .setDescription([
          `<:alert:1363009864112144394> <:arrows:1363099226375979058> **FINAL WARNING**`,
          '',
          `Are you absolutely sure you want to nuke **${message.guild.name}**?`,
          '',
          '-# Click Nuke to proceed.'
        ].join('\n'));

      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_nuke')
            .setLabel('Nuke')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_nuke')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );

      const finalConfirmation = await message.channel.send({
        embeds: [finalEmbed],
        components: [confirmRow]
      }).catch(() => {});

      if (!finalConfirmation) return;

      const buttonFilter = i => i.user.id === message.author.id;
      const buttonCollector = finalConfirmation.createMessageComponentCollector({
        filter: buttonFilter,
        time: 30000
      });

      buttonCollector.on('collect', async i => {
        if (i.customId === 'cancel_nuke') {
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Nuke **cancelled**')
            ],
            components: []
          }).catch(() => {});
          return;
        }

        // Execute nuke
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#ff4d4d')
              .setDescription('<:arrows:1363099226375979058> Nuking server...')
          ],
          components: []
        }).catch(() => {});

        let deleted = {
          channels: 0,
          roles: 0,
          emojis: 0,
          stickers: 0,
          webhooks: 0,
          bans: 0
        };

        // Delete all channels
        const channels = message.guild.channels.cache;
        for (const [id, channel] of channels) {
          try {
            await channel.delete();
            deleted.channels++;
          } catch (err) {}
        }

        // Delete all roles (except @everyone and roles higher than bot)
        const roles = message.guild.roles.cache.filter(r => 
          r.id !== message.guild.id && 
          r.position < botMember.roles.highest.position &&
          !r.managed
        );
        for (const [id, role] of roles) {
          try {
            await role.delete();
            deleted.roles++;
          } catch (err) {}
        }

        // Delete all emojis
        const emojis = message.guild.emojis.cache;
        for (const [id, emoji] of emojis) {
          try {
            await emoji.delete();
            deleted.emojis++;
          } catch (err) {}
        }

        // Delete all stickers
        const stickers = message.guild.stickers.cache;
        for (const [id, sticker] of stickers) {
          try {
            await sticker.delete();
            deleted.stickers++;
          } catch (err) {}
        }

        // Remove all bans
        try {
          const bans = await message.guild.bans.fetch();
          for (const [id, ban] of bans) {
            try {
              await message.guild.members.unban(id);
              deleted.bans++;
            } catch (err) {}
          }
        } catch (err) {}

        // Create a new channel to send completion message
        try {
          const newChannel = await message.guild.channels.create({
            name: 'nuked',
            type: 0 // Text channel
          });

          const resultEmbed = new EmbedBuilder()
            .setColor('#ff4d4d')
            .setDescription([
              `<:check:1362850043333316659> <:arrows:1363099226375979058> **Server nuked**`,
              '',
              `Channels: \`${deleted.channels}\``,
              `Roles: \`${deleted.roles}\``,
              `Emojis: \`${deleted.emojis}\``,
              `Stickers: \`${deleted.stickers}\``,
              `Bans removed: \`${deleted.bans}\``
            ].join('\n'));

          await newChannel.send({ embeds: [resultEmbed] }).catch(() => {});
        } catch (err) {
          console.error('Could not create channel after nuke:', err);
        }
      });

      buttonCollector.on('end', collected => {
        if (collected.size === 0) {
          finalConfirmation.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:alert:1363009864112144394> <:arrows:1363099226375979058> Confirmation **timed out**')
            ],
            components: []
          }).catch(() => {});
        }
      });
    });

    nameCollector.on('end', collected => {
      if (collected.size === 0) {
        confirmation.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:alert:1363009864112144394> <:arrows:1363099226375979058> Confirmation **timed out**')
          ]
        }).catch(() => {});
      }
    });
  }
};

