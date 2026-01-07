const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const processingCommands = new Set();

// Helper function to get or load autoresponses for a guild
function getGuildAutoResponses(guildId, autoResponses, dbHelpers) {
  let guildAutoResponses = autoResponses.get(guildId);
  if (!guildAutoResponses && dbHelpers) {
    // Load from database if not in cache
    guildAutoResponses = dbHelpers.getAutoResponses(guildId);
    autoResponses.set(guildId, guildAutoResponses);
  }
  return guildAutoResponses || new Map();
}

module.exports = {
  name: 'autoresponder',
  description: '<:arrows:1457808531678957784> Create a trigger with a auto response.',
  category: 'moderation',
  async execute(message, args, { autoResponses, saveData, client, prefix, dbHelpers }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** permissions to use this command.')
        ],
        allowedMentions: { repliedUser: false }
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
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}autoresponder (subcommand), (args)\`\`\``,
              '-# <:arrows:1457808531678957784> **__Subcommand__:** \n <:leese:1457834970486800567> `add` create a trigger \n <:leese:1457834970486800567> `delete` to remove it \n <:tree:1457808523986731008> `list` to view triggers.',
              '\n**Aliases:** `N/A`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    // ============================
    // HANDLE LIST COMMAND
    // ============================
    if (subcommand === 'list') {
      const guildId = message.guild.id;
      const guildAutoResponses = getGuildAutoResponses(guildId, autoResponses, dbHelpers);

      const replyList = guildAutoResponses.size > 0
        ? Array.from(guildAutoResponses.entries())
            .map(([trigger, response], index) => `\`${index + 1}\`. **${trigger}**`) 
            .join('\n')
        : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> \`N/A\`';

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Auto responses')
        .setDescription(replyList);

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    // ============================
    // HANDLE REMOVAL
    // ============================
    const isDelete = subcommand === 'delete' || subcommand === 'remove';
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
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}autoresponder delete <trigger>\`\`\``,
                '-# <:arrows:1457808531678957784> Removes an existing trigger',
                '',
                `**Examples:** \`${prefix}autoresponder delete hello\``,
                '\n**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const guildId = message.guild.id;
      const triggerToRemove = args.join(' ').toLowerCase();

      const guildAutoResponses = getGuildAutoResponses(guildId, autoResponses, dbHelpers);
      if (!guildAutoResponses || guildAutoResponses.size === 0) {
        processingCommands.delete(message.id);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No autoresponses found in this server.')
          ],
          allowedMentions: { repliedUser: false }
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
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **No autoresponse found for trigger:** \`${triggerToRemove}\``)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      guildAutoResponses.delete(foundTrigger);
      if (dbHelpers) {
        dbHelpers.setAutoResponse(guildId, foundTrigger, null);
      }
      processingCommands.delete(message.id);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:deleted:1457808575316492309> <:arrows:1457808531678957784> **Removed auto response** for \`${foundTrigger}\``)
        ],
        allowedMentions: { repliedUser: false }
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
                '<:settings:1457808572720087266> **Usage:**',
                `\`\`\`${prefix}autoresponder add <trigger>, <response>\`\`\``,
                '-# <:arrows:1457808531678957784> Creates a new trigger',
                '',
                `**Examples:** \`${prefix}autoresponder add hello, Hi there!\``,
                '\n**Aliases:** `N/A`'
              ].join('\n'))
          ],
          allowedMentions: { repliedUser: false }
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
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Separate the **trigger** and **response** with a comma. \n-# <:tree:1457808523986731008> **Example:** \`${prefix}autoresponder add hi, hello!\``)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const trigger = cleanText.slice(0, commaIndex).trim();
      const response = cleanText.slice(commaIndex + 1).trim();

      if (!trigger || !response) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Both **trigger** and **response** are required. \n-# <:tree:1457808523986731008> **Example:** \`${prefix}autoresponder add hi, hello!\``)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      let guildAutoResponses = getGuildAutoResponses(guildId, autoResponses, dbHelpers);

      guildAutoResponses.set(trigger, {
        response,
        strict: isStrict,
        reply: shouldReply
      });
      if (dbHelpers) {
        dbHelpers.setAutoResponse(guildId, trigger, response, isStrict, shouldReply);
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`**Added auto response:**\n\n <:leese:1457834970486800567> \`Trigger\`: **${trigger}**\n\n <:leese:1457834970486800567> \`Response\`: **${response}**\n\n <:leese:1457834970486800567> \`Strict\`: ${isStrict ? '<:check:1457808518848581858>' : '<:cr0ss:1362851089761833110>'}\n\n <:tree:1457808523986731008> \`Reply\`: ${shouldReply ? '<:check:1457808518848581858>' : '<:cr0ss:1457809446620369098>'}`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};

// Shared listener remains unchanged
module.exports.listenForTriggers = (client, autoResponses, dbHelpers) => {
  client.on('messageCreate', async (message) => {
    if (
      message.author.bot ||
      processingCommands.has(message.id) ||
      !message.guild
    ) {
      return;
    }

    const guildId = message.guild.id;
    const guildAutoResponses = getGuildAutoResponses(guildId, autoResponses, dbHelpers);
    if (!guildAutoResponses || guildAutoResponses.size === 0) return;

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

