const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'emoji',
  aliases: ['ea', 'ed'],
  description: '<:arrows:1363099226375979058> Add & remove an emoji from the server',
  category: 'utilities',
  async execute(message, args, { client, prefix }) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Emojis and Stickers** permissions to use this command.')
        ]
      });
    }

    const botMember = message.guild.members.resolve(client.user);
    if (!botMember.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> I need **Manage Emojis and Stickers** permissions to manage emojis.')
        ]
      });
    }

    const commandName = message.content.split(' ')[0].slice(1).toLowerCase();
    const subcommand = args[0]?.toLowerCase();

    // Show help if no subcommand is provided
    if (!subcommand && commandName === 'emoji') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}emoji (subcommand) (args)\`\`\``,
              '-# <:arrows:1363099226375979058> Use `add` to add an emoji, or `delete` to remove it.',
              '\n**Aliases:** `N/A`'
            ].join('\n'))
        ]
      });
    }

    // ===== ADD EMOJI =====
    const isAdd = subcommand === 'add' || commandName === 'ea';
    if (isAdd) {
      // Remove 'add' if using full command
      if (subcommand === 'add') args.shift();

      if (args.length < 1) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}emoji add <emoji>\`\`\``,
                '-# <:arrows:1363099226375979058> Adds emoji(s) to the server',
                '',
                `**Examples:** \`${prefix}emoji add 😭 💀 😄\``,
                '\n**Aliases:** `N/A`',
                '\n-# **Note:** You can add up to **10 emojis** at once'
              ].join('\n'))
          ]
        });
      }

      const emojiInputs = args;
      if (emojiInputs.length > 10) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor('#838996').setDescription('<:info:1363009904293576744> You can only add up to **10** emojis at once.')]
        });
      }

      let addedEmojis = [];
      let failedEmojis = [];

      for (const emojiInput of emojiInputs) {
        try {
          const customEmojiMatch = emojiInput.match(/^<a?:(\w+):(\d+)>$/);
          let emojiName, emojiUrl, isAnimated;

          if (customEmojiMatch) {
            emojiName = customEmojiMatch[1];
            const emojiId = customEmojiMatch[2];
            isAnimated = emojiInput.startsWith('<a:');
            emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?v=1`;
          } else {
            failedEmojis.push(`<:excl:1362858572677120252> <:arrows:1363099226375979058> \`${emojiInput}\` (Invalid emoji)`);
            continue;
          }

          const existingEmoji = message.guild.emojis.cache.find(e => e.name.toLowerCase() === emojiName.toLowerCase());
          if (existingEmoji) {
            failedEmojis.push(`<:excl:1362858572677120252> <:arrows:1363099226375979058> The emoji \`${emojiName}\` already exists`);
            continue;
          }

          const newEmoji = await message.guild.emojis.create({ attachment: emojiUrl, name: emojiName });
          addedEmojis.push(`[\`${emojiName}\`](https://cdn.discordapp.com/emojis/${newEmoji.id}.${isAnimated ? 'gif' : 'png'})`);
        } catch (error) {
          console.error('Error adding emoji:', error);
          failedEmojis.push('<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to add emoji');
        }
      }

      const embed = new EmbedBuilder().setColor('#838996');
      if (addedEmojis.length > 0) embed.addFields({ name: 'Emojis Added:', value: addedEmojis.join('\n') });
      if (failedEmojis.length > 0) embed.addFields({ name: '', value: failedEmojis.join('\n') });

      return message.reply({ embeds: [embed] });
    }

    // ===== DELETE EMOJI =====
    const isDelete = subcommand === 'delete' || commandName === 'ed';
    if (isDelete) {
      // Remove 'delete' if using full command
      if (subcommand === 'delete') args.shift();

      if (args.length < 1) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}emoji delete <name>\`\`\``,
                '-# <:arrows:1363099226375979058> Deletes an emoji from the server',
                '',
                `**Examples:** \`${prefix}emoji delete money\``,
                '\n**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const emojiName = args[0].toLowerCase();
      const emoji = message.guild.emojis.cache.find(e => e.name.toLowerCase() === emojiName);

      if (!emoji) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> No **emoji** with the name \`${emojiName}\` found.`)
          ]
        });
      }

      try {
        await emoji.delete();
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:deleted:1363170791457427546> <:arrows:1363099226375979058> **Deleted emoji** \`${emojiName}\``)
          ]
        });
      } catch (error) {
        console.error('Error deleting emoji:', error);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> An error occurred while deleting the emoji.')
          ]
        });
      }
    }
  }
};