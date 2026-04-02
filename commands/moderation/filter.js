const { EmbedBuilder, AutoModerationRuleTriggerType, AutoModerationRuleEventType, PermissionsBitField } = require('discord.js');

// auto mod api vs manual word list — we juggle both and my brain filed for leave 😭

module.exports = {
  name: 'filter',
  category: 'moderation',
  description: '<:arrows:1457808531678957784> Manage or view filtered words in the server.',
  async execute(message, args, { filteredWords, saveData, prefix }) {
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

    const subcommand = args[0]?.toLowerCase();
    const word = args[1]?.toLowerCase();
    const guildId = message.guild.id;
    let guildFilteredWords = filteredWords.get(guildId) || new Set();

    if (subcommand === 'list') {
      const wordList = guildFilteredWords.size > 0
        ? Array.from(guildFilteredWords).map((word, index) => `\`${index + 1}\` **${word}**`).join('\n')
        : '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> No filtered words set.';

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Filtered Words')
        .setDescription(wordList);

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (!['add', 'remove'].includes(subcommand) || !word) {
      let usageEmbed;
      if (subcommand === 'add') {
        usageEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}filter add <word>\`\`\``,
            '-# <:arrows:1457808531678957784> Adds a word to the filtered list.',
            '',
            `**Example:** \`${prefix}filter add weed\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'));
      } else if (subcommand === 'remove') {
        usageEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}filter remove <word>\`\`\``,
            '-# <:arrows:1457808531678957784> Removes a word from the filtered list.',
            '',
            `**Example:** \`${prefix}filter remove weed\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'));
      } else {
        usageEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}filter (subcommand) (args)\`\`\``,
            '-# <:arrows:1457808531678957784> **__Subcommands__**\n <:leese:1457834970486800567> `add` to filter a word\n <:leese:1457834970486800567> `remove` to unfilter it\n <:tree:1457808523986731008> `list` to view them.',
            '',
            '**Aliases:** `N/A`'
          ].join('\n'));
      }

      return message.reply({ embeds: [usageEmbed], allowedMentions: { repliedUser: false } });
    }

    if (subcommand === 'add') {
      if (guildFilteredWords.has(word)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> <@${message.author.id}>: The word \`${word}\` is already **filtered**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      guildFilteredWords.add(word);
      filteredWords.set(guildId, guildFilteredWords);
      saveData();

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> **Added** \`${word}\` to **filtered words**.`)
        ],
        allowedMentions: { repliedUser: false }
      });

      try {
        const botMember = await message.guild.members.fetchMe();
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;

        const rules = await message.guild.autoModerationRules.fetch();
        let filterRule = rules.find(rule => rule.name === 'Filtered Words');

        if (filterRule) {
          const existingWords = filterRule.triggerMetadata.keywordFilter || [];
          if (!existingWords.includes(word)) {
            existingWords.push(word);
            await filterRule.edit({ triggerMetadata: { keywordFilter: existingWords } });
          }
        } else {
          await message.guild.autoModerationRules.create({
            name: 'Filtered Words',
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.Keyword,
            triggerMetadata: { keywordFilter: [word] },
            actions: [{ type: 1 }],
            enabled: true
          });
        }
      } catch (err) {
        console.error('Error updating AutoModeration rule:', err);
      }
    }

    else if (subcommand === 'remove') {
      if (!guildFilteredWords.has(word)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> The word \`${word}\` is not **filtered**.`)
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      guildFilteredWords.delete(word);
      if (guildFilteredWords.size === 0) {
        filteredWords.delete(guildId);
      }
      saveData();

      try {
        const rules = await message.guild.autoModerationRules.fetch();
        const filterRule = rules.find(rule => rule.name === 'Filtered Words');
        if (filterRule) {
          const updatedWords = (filterRule.triggerMetadata.keywordFilter || []).filter(w => w !== word);
          if (updatedWords.length > 0) {
            await filterRule.edit({ triggerMetadata: { keywordFilter: updatedWords } });
          } else {
            await filterRule.delete();
          }
        }
      } catch (err) {
        console.error('Error updating AutoModeration rule:', err);
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:deleted:1457808575316492309> <:arrows:1457808531678957784> **Removed** \`${word}\` from **filtered words**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
