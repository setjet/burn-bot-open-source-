const { EmbedBuilder } = require('discord.js');

// vm help: shorter than the guilt of not finishing vm 😭

module.exports = {
  name: 'help',
  async execute(message, args, { prefix }) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setTitle('<:settings:1457808572720087266> VoiceMaster')
          .setDescription([
            '<:settings:1457808572720087266> **Usage:**',
            `\`\`\`${prefix}voicemaster <subcommand> (args)\`\`\``,
            '-# <:arrows:1457808531678957784> Create and control temporary voice channels.',
            '',
            '<:leese:1457834970486800567> **Setup (admin):** `' + prefix + 'voicemaster setup`',
            '<:tree:1457808523986731008> **Defaults (admin):** `category`, `default name/bitrate/region`',
            '<:leese:1457834970486800567> **Join role (admin):** `' + prefix + 'voicemaster join role <role>`',
            '',
            '**In your temp channel:**',
            '-# `rename` · `limit` · `lock` / `unlock` · `ghost` / `unghost` · `permit` · `claim` · `transfer` · `music`',
            '',
            '-# <:arrows:1457808531678957784> Only the **channel owner** (who created it) can use channel commands.'
          ].join('\n'))
      ],
      allowedMentions: { repliedUser: false }
    });
  }
};
