const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const processingCommands = new Set();

module.exports = {
  name: 'autoresponder',
  description: '<:arrows:1363099226375979058> Create a trigger with a auto response.',
  category: 'utilities',
  async execute(message, args, { autoResponses, saveData, client, prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Channels** permissions to use this command.')
        ]
      });
    }

    const commandName = message.content.split(' ')[0].slice(1).toLowerCase();
    const subcommand = args[0]?.toLowerCase();

    // Show help if no subcommand is provided
    if (!subcommand && commandName === 'autoresponder') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}autoresponder (subcommand), (args)\`\`\``,
              '-# <:arrows:1363099226375979058> Use `add` create a trigger, `delete` to remove it, or `list` to view all triggers.',
              '\n**Aliases:** `N/A`'
            ].join('\n'))
        ]
      });
    }

    // ============================
    // HANDLE LIST COMMAND
    // ============================
    if (subcommand === 'list') {
      const guildId = message.guild.id;
      const guildAutoResponses = autoResponses.get(guildId) || new Map();

      const replyList = guildAutoResponses.size > 0
        ? Array.from(guildAutoResponses.entries())
            .map(([trigger, response], index) => `\`${index + 1}\`. **${trigger}**`) 
            .join('\n')
        : '<:excl:1362858572677120252> <:arrows:1363099226375979058> \`N/A\`';

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Auto responses')
        .setDescription(replyList);

      return message.reply({ embeds: [embed] });
    }

    // ============================
    // HANDLE REMOVAL
    // ============================
    const isDelete = subcommand === 'delete' || subcommand === 'remove' || commandName === 'ar' || commandName === 'arr';
    if (isDelete) {
      // Remove 'delete' if using full command
      if (subcommand === 'delete' || subcommand === 'remove') args.shift();
      processingCommands.add(message.id);

      if (args.length < 1) {
        processingCommands.delete(message.id);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}autoresponder delete <trigger>\`\`\``,
                '-# <:arrows:1363099226375979058> Removes an existing trigger',
                '',
                `**Examples:** \`${prefix}autoresponder delete hello\``,
                '\n**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const guildId = message.guild.id;
      const triggerToRemove = args.join(' ').toLowerCase();

      const guildAutoResponses = autoResponses.get(guildId);
      if (!guildAutoResponses || guildAutoResponses.size === 0) {
        processingCommands.delete(message.id);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> No autoresponses found in this server.')
          ]
        });
      }

      const foundTrigger = [...guildAutoResponses.keys()].find(t =>
        t.toLowerCase().includes(triggerToRemove)
      );

      if (!foundTrigger) {
        processingCommands.delete(message.id);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **No autoresponse found for trigger:** \`${triggerToRemove}\``)
          ]
        });
      }

      guildAutoResponses.delete(foundTrigger);
      saveData();
      processingCommands.delete(message.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:deleted:1363170791457427546> <:arrows:1363099226375979058> **Removed auto response** for \`${foundTrigger}\``)
        ]
      });
    }

    // ============================
    // HANDLE ADDING
    // ============================
    const isAdd = subcommand === 'add' || (args.length >= 2 && !isDelete);
    if (isAdd) {
      // Remove 'add' if using full command
      if (subcommand === 'add') args.shift();

      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}autoresponder add <trigger>, <response>\`\`\``,
                '-# <:arrows:1363099226375979058> Creates a new trigger',
                '',
                `**Examples:** \`${prefix}autoresponder add hello, Hi there!\``,
                '\n**Aliases:** `N/A`'
              ].join('\n'))
          ]
        });
      }

      const guildId = message.guild.id;
      const fullText = args.join(' ');

      const isStrict = fullText.includes('--strict');
      const shouldReply = fullText.includes('--reply');

      let cleanText = fullText
        .replace(/--strict/g, '')
        .replace(/--reply/g, '')
        .trim();

      const commaIndex = cleanText.indexOf(',');
      if (commaIndex === -1) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Separate the trigger and response with a comma.** Example: \`${prefix}ar hi, hello!\``)
          ]
        });
      }

      const trigger = cleanText.slice(0, commaIndex).trim();
      const response = cleanText.slice(commaIndex + 1).trim();

      if (!trigger || !response) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Both trigger and response are required.** Example: \`${prefix}ar hi, hello!\``)
          ]
        });
      }

      let guildAutoResponses = autoResponses.get(guildId);
      if (!guildAutoResponses) {
        guildAutoResponses = new Map();
        autoResponses.set(guildId, guildAutoResponses);
      }

      guildAutoResponses.set(trigger, {
        response,
        strict: isStrict,
        reply: shouldReply
      });
      saveData();

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`**Added auto response:**\n\n\`Trigger\`: **${trigger}**\n\n\`Response\`: **${response}**\n\n\`Strict\`: ${isStrict ? '<:check:1362850043333316659>' : '<:cr0ss:1362851089761833110>'}\n\n\`Reply\`: ${shouldReply ? '<:check:1362850043333316659>' : '<:cr0ss:1362851089761833110>'}`)
        ]
      });
    }
  }
};

// Shared listener remains unchanged
module.exports.listenForTriggers = (client, autoResponses) => {
  client.on('messageCreate', async (message) => {
    if (
      message.author.bot ||
      processingCommands.has(message.id) ||
      !message.guild
    ) {
      return;
    }

    const guildId = message.guild.id;
    const guildAutoResponses = autoResponses.get(guildId);
    if (!guildAutoResponses) return;

    const content = message.content.toLowerCase();

    for (const [trigger, { response, strict, reply }] of guildAutoResponses) {
      const isMatch = strict
        ? content === trigger.toLowerCase()
        : content.includes(trigger.toLowerCase());

      if (isMatch) {
        try {
          if (reply) {
            await message.reply(response);
          } else {
            await message.channel.send(response);
          }
        } catch (error) {
          console.error('Failed to send autoresponse:', error);
        }
      }
    }
  });
};