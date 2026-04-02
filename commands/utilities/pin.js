const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// fetch message by id + pin permission edge cases 😭

module.exports = {
  name: 'pin',
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Pin a message in the channel.',
  async execute(message, args, { prefix }) {
    // Check if user has Manage Channels permission
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embedNoPermissions = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** permissions to use this command.');
      return message.reply({ embeds: [embedNoPermissions], allowedMentions: { repliedUser: false } });
    }

    // Check if bot has Manage Messages permission (needed to pin)
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const embedBotNoPerms = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Messages** permissions to pin messages.');
      return message.reply({ embeds: [embedBotNoPerms], allowedMentions: { repliedUser: false } });
    }

    // Check if user replied to a message
    if (!message.reference?.messageId) {
      const embedUsage = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}pin (message)\`\`\``,
          '-# <:arrows:1457808531678957784> Reply to a message to pin it.',
          '',
          '**Example:** `N/A`',
          '\n**Aliases:** `N/A`'
        ].join('\n'));
      return message.reply({ embeds: [embedUsage], allowedMentions: { repliedUser: false } });
    }

    try {
      // Fetch the replied message
      const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
      
      // Check if message is already pinned
      if (repliedMsg.pinned) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This message is **already pinned**.')
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      // Pin the message
      await repliedMsg.pin();

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Pinned** the message in this channel.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error('Pin Error:', error);
      let msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to pin the message.';
      
      if (error.code === 50019) {
        msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Cannot pin this message. The channel may have reached the **maximum pinned messages limit** (50).';
      } else if (error.code === 10008) {
        msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The message you replied to **no longer exists**.';
      } else if (error.code === 50013) {
        msg = '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I don\'t have permission to pin messages in this channel.';
      }
      
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#838996').setDescription(msg)],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};

