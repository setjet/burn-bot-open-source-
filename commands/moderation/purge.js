const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'purge',
  aliases: ['c'],
  category: 'moderation', 
  description: '<:arrows:1363099226375979058> Delete messages',
  async execute(message, args, { prefix }) {

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need the **Manage Messages** permission to use this command.');
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}purge <user>\`\`\``,
              '-# <:arrows:1363099226375979058> Delete messages from a user & channel.',
              '',
              `**Example:** \`${prefix}purge @jet 69\``,
              '\n**Aliases:** `c`'
            ].join('\n'))
        ]
      });
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'contains') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Provide a **word** to search for. **Example:** \`${prefix}c contains <word>\``)
          ]
        });
      }

      const word = args[1].toLowerCase();
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const wordMessages = messages.filter(m => m.content.toLowerCase().includes(word));
      await message.channel.bulkDelete(wordMessages, true).catch(() => {});
      await message.delete().catch(() => {});
      return;
    }

    if (sub === 'images') {
      const messages = await message.channel.messages.fetch({ limit: 50 });
      const imageMessages = messages.filter(m => m.attachments.size > 0).first(10);
      for (const msg of imageMessages) await msg.delete().catch(() => {});
      await message.delete().catch(() => {});
      return;
    }

    if (sub === 'emojis') {
      const emojiRegex = /<a?:\w+:\d+>|[\u2190-\u21FF\u2300-\u27BF\u1F000-\u1FAFF]/;
      const messages = await message.channel.messages.fetch({ limit: 100 });
      const emojiMessages = messages.filter(m => emojiRegex.test(m.content));
      await message.channel.bulkDelete(emojiMessages, true).catch(() => {});
      await message.delete().catch(() => {});
      return;
    }

    let targetUser, count;

    if (!isNaN(args[0])) {
      count = parseInt(args[0]);
      if (isNaN(count) || count < 1) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`❌ Invalid amount. Usage: \`${prefix}clear <amount>\``);
        return message.reply({ embeds: [embed] }).catch(() => {});
      }
    } else {
      const userInput = args[0];
      targetUser = message.mentions.users.first();

      if (!targetUser) {
        try {
          targetUser = await message.client.users.fetch(userInput).catch(() => null);
        } catch {}

        if (!targetUser) {
          const members = await message.guild.members.fetch();
          targetUser = members.find(member => 
            member.user.username.toLowerCase() === userInput.toLowerCase() ||
            member.displayName.toLowerCase() === userInput.toLowerCase() ||
            member.user.id === userInput
          )?.user;
        }
      }

      if (!targetUser) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User not found. **Example**: \`${prefix}clear <user> <amount>\``);
        return message.reply({ embeds: [embed] }).catch(() => {});
      }

      // Default to 10 messages if no count is specified
      count = args[1] ? parseInt(args[1]) : 10;
      if (isNaN(count) || count < 1) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid format. **Example**: \`${prefix}clear <amount>\``);
        return message.reply({ embeds: [embed] }).catch(() => {});
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
        break;
      }
    }

    return;
  }
};