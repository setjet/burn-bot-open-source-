const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// bulk delete + "message is too old" discord rules = classic duo 😭

module.exports = {
  name: 'purge',
  aliases: ['c'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Delete messages',
  async execute(message, args, { prefix, getUser: getUserParam }) {

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need the **Manage Messages** permission to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}purge <amount>\`\`\``,
            '-# <:arrows:1457808531678957784> **__Subcommands__**\n <:leese:1457834970486800567> `contains` Delete a specific word\n <:leese:1457834970486800567> `images` Delete messages with images\n <:tree:1457808523986731008> `emojis` Delete messages with emojis',
            '',
            '**Aliases:** `c`'
          ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'contains') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Provide a **word** to search for.\n-# <:tree:1457808523986731008> **Example:** \`${prefix}purge contains <word>\``)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const word = args[1].toLowerCase();
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const toDelete = [];
      for (const m of messages.values()) {
        if (m.id === message.id) continue;
        const content = typeof m.content === 'string' ? m.content : '';
        if (content.toLowerCase().includes(word)) toDelete.push(m);
      }
      if (toDelete.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:info:1457809654120714301> <:arrows:1457808531678957784> No messages found containing \`${word}\`.`);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
      await message.channel.bulkDelete(toDelete, true).catch(() => {});
      await message.delete().catch(() => {});
      return;
    }

    if (sub === 'images') {
      const messages = await message.channel.messages.fetch({ limit: 50 });
      const toDelete = [];
      for (const m of messages.values()) {
        if (m.id === message.id) continue;
        if (m.attachments && m.attachments.size > 0) toDelete.push(m);
        if (toDelete.length >= 10) break;
      }
      if (toDelete.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:info:1457809654120714301> <:arrows:1457808531678957784> No messages with images found.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
      await message.channel.bulkDelete(toDelete, true).catch(() => {});
      await message.delete().catch(() => {});
      return;
    }

    if (sub === 'emojis') {
      const emojiRegex = /<a?:\w+:\d+>|[\u2600-\u26FF\u2700-\u27BF\u1F300-\u1F9FF\u1F600-\u1F64F\u1F900-\u1F9FF]/;
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const toDelete = [];
      for (const m of messages.values()) {
        if (m.id === message.id) continue;
        const content = typeof m.content === 'string' ? m.content : '';
        if (content.length === 0) continue;
        if (emojiRegex.test(content)) toDelete.push(m);
      }
      if (toDelete.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:info:1457809654120714301> <:arrows:1457808531678957784> No messages with emojis found.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
      await message.channel.bulkDelete(toDelete, true).catch(() => {});
      await message.delete().catch(() => {});
      return;
    }

    let targetUser, count;

    if (!isNaN(args[0])) {
      count = parseInt(args[0]);
      if (isNaN(count) || count < 1 || count > 100) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid amount. Must be between **1** and **100**.\n-# <:tree:1457808523986731008> **Usage**: \`${prefix}purge <amount>\``);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
    } else {
      const userInput = args[0];
      
      // Check if getUser is available and is a function
      const getUserFunction = getUserParam;
      if (!getUserFunction || typeof getUserFunction !== 'function') {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User search functionality is not available. Please contact the bot developer.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
      
      try {
        targetUser = await getUserFunction(message, userInput);
      } catch (err) {
        console.error('Error finding user in purge:', err);
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> An error occurred while searching for user \`${userInput}\`.`);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      if (!targetUser) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${userInput}\` not found.\n-# <:tree:1457808523986731008> Try using a **user mention**, **user ID**, or **username**.\n-# <:tree:1457808523986731008> **Example**: \`${prefix}purge @user 10\` or \`${prefix}purge 123456789012345678 10\``);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }

      // Default to 10 messages if no count is specified
      count = args[1] ? parseInt(args[1]) : 10;
      if (isNaN(count) || count < 1 || count > 100) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid amount. Must be between **1** and **100**.\n-# <:tree:1457808523986731008> **Example**: \`${prefix}purge @user 10\``);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
      }
    }

    await message.delete().catch(() => {});

    const maxPerBatch = 100;
    let remaining = count;
    let deletedTotal = 0;

    while (remaining > 0 && deletedTotal < count) {
      const fetchLimit = Math.min(remaining, maxPerBatch);
      const messages = await message.channel.messages.fetch({ limit: fetchLimit }).catch(() => null);

      if (!messages || messages.size === 0) break;

      const toDelete = messages.filter(msg => {
        if (msg.id === message.id) return false;
        if (targetUser) return msg.author.id === targetUser.id;
        return true;
      });

      if (toDelete.size === 0) break;

      const deleteCount = Math.min(toDelete.size, remaining);
      const deleteBatch = Array.from(toDelete.values()).slice(0, deleteCount);

      try {
        if (deleteBatch.length === 1) {
          await deleteBatch[0].delete();
          deletedTotal += 1;
          remaining -= 1;
        } else {
          await message.channel.bulkDelete(deleteBatch, true);
          deletedTotal += deleteBatch.length;
          remaining -= deleteBatch.length;
        }

        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Clear Error:', error);
        // If it's a rate limit, wait a bit and continue
        if (error.code === 429) {
          const retryAfter = error.retryAfter || 2;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        // For other errors, break the loop
        break;
      }
    }

    return;
  }
};