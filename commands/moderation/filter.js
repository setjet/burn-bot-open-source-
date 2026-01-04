const { EmbedBuilder, AutoModerationRuleTriggerType, AutoModerationRuleEventType, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'filter',
  category: 'moderation',
  description: '<:arrows:1363099226375979058> Manage or view filtered words in the server.',
  async execute(message, args, { filteredWords, saveData, prefix }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Manage Channels** permissions to use this command.')
        ]
      });
    }

    const subcommand = args[0]?.toLowerCase();
    const word = args[1]?.toLowerCase();
    const guildId = message.guild.id;
    let guildFilteredWords = filteredWords.get(guildId) || new Set();

    if (subcommand === 'list') {
      const wordList = guildFilteredWords.size > 0
        ? Array.from(guildFilteredWords).map((word, index) => `\`${index + 1}\` **${word}**`).join('\n')
        : '<:excl:1362858572677120252> <:arrows:1363099226375979058> No filtered words set.';

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Filtered Words')
        .setDescription(wordList);

      return message.reply({ embeds: [embed] });
    }

    if (!['add', 'remove'].includes(subcommand) || !word) {
      let usageEmbed;
      if (subcommand === 'add') {
        usageEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}filter add <word>\`\`\``,
            '-# <:arrows:1363099226375979058> Adds a word to the filtered list.',
            '',
            `**Example:** \`${prefix}filter add weed\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'));
      } else if (subcommand === 'remove') {
        usageEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}filter remove <word>\`\`\``,
            '-# <:arrows:1363099226375979058> Removes a word from the filtered list.',
            '',
            `**Example:** \`${prefix}filter remove weed\``,
            '\n**Aliases:** `N/A`'
          ].join('\n'));
      } else {
        usageEmbed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}filter (subcommand) (args)\`\`\``,
            '-# <:arrows:1363099226375979058> Use `add` to filter a word, `remove` to unfilter it, or `list` to view them.',
            '',
            '**Aliases:** `N/A`'
          ].join('\n'));
      }

      return message.reply({ embeds: [usageEmbed] });
    }

    if (subcommand === 'add') {
      if (guildFilteredWords.has(word)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${message.author.id}>: The word \`${word}\` is already **filtered**.`)
          ]
        });
      }

      guildFilteredWords.add(word);
      filteredWords.set(guildId, guildFilteredWords);
      saveData();

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Added** \`${word}\` to **filtered words**.`)
        ]
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
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> The word \`${word}\` is not **filtered**.`)
          ]
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
            .setDescription(`<:deleted:1363170791457427546> <:arrows:1363099226375979058> **Removed** \`${word}\` from **filtered words**.`)
        ]
      });
    }
  }
};
