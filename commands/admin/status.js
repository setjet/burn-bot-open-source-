const { EmbedBuilder, ActivityType } = require('discord.js');

// Only allow the main developer to change the bot's status
const AUTHORIZED_USER_ID = '1355470391102931055';

module.exports = {
  name: 'status',
  aliases: ['setstatus'],
  category: 'admin',
  description: '<:arrows:1457808531678957784> Change the bot’s status and activity (Developer only).',
  async execute(message, args, { client, prefix }) {
    // Restrict to authorized user only
    if (message.author.id !== AUTHORIZED_USER_ID) {
      return; // Silently ignore others
    }

    if (!args.length) {
      const usageEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          '<:settings:1457808572720087266> **Usage:**',
          `\`\`\`${prefix}status [presence] <type> <text>\`\`\``,
          `\`\`\`${prefix}status [presence] streaming <url> <text>\`\`\``,
          '',
          '<:arrows:1457808531678957784> **Presence (optional):**',
          '- `online`',
          '- `dnd`',
          '- `idle`',
          '- `invisible`',
          '',
          '<:arrows:1457808531678957784> **Types:**',
          '- `watching`',
          '- `playing`',
          '- `listening`',
          '- `competing`',
          '- `streaming`',
          '',
          '**Examples:**',
          `\`${prefix}status watching Hey there!\``,
          `\`${prefix}status dnd playing with fire\``,
          `\`${prefix}status invisible listening music\``,
          `\`${prefix}status streaming https://twitch.tv/usync live now\``,
          '',
          '**Aliases:** `setstatus`'
        ].join('\n'));

      return message.reply({ embeds: [usageEmbed] });
    }

    // Optional presence arg
    const presenceOptions = new Set(['online', 'dnd', 'idle', 'invisible']);
    let presenceStatus = 'online';
    if (args[0] && presenceOptions.has(args[0].toLowerCase())) {
      presenceStatus = args.shift().toLowerCase();
    }

    const typeArg = (args.shift() || '').toLowerCase();
    let streamUrl = null;
    if (typeArg === 'streaming') {
      streamUrl = args.shift() || null;
    }

    const statusText = args.join(' ').trim();

    if (!typeArg) {
      const noTypeEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1457808572677120252> <:arrows:1457808531678957784> Please provide an activity type.\n\`\`\`${prefix}status [presence] <type> <text>\`\`\``);
      return message.reply({ embeds: [noTypeEmbed] });
    }

    if (typeArg === 'streaming' && (!streamUrl || !/^https?:\/\//i.test(streamUrl))) {
      const noUrlEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1457808572677120252> <:arrows:1457808531678957784> Streaming requires a valid URL.\n\`\`\`${prefix}status [presence] streaming <url> <text>\`\`\``);
      return message.reply({ embeds: [noUrlEmbed] });
    }

    if (!statusText) {
      const noTextEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1457808572677120252> <:arrows:1457808531678957784> Please provide the status text.\n\`\`\`${prefix}status [presence] <type> <text>\`\`\``);
      return message.reply({ embeds: [noTextEmbed] });
    }

    let activityType = ActivityType.Playing;
    const activityPayload = {
      name: statusText,
      type: ActivityType.Playing
    };

    switch (typeArg) {
      case 'watching':
        activityType = ActivityType.Watching;
        break;
      case 'listening':
        activityType = ActivityType.Listening;
        break;
      case 'competing':
        activityType = ActivityType.Competing;
        break;
      case 'streaming':
        activityType = ActivityType.Streaming;
        break;
      case 'playing':
      default:
        activityType = ActivityType.Playing;
        break;
    }

    try {
      activityPayload.type = activityType;
      if (typeArg === 'streaming') {
        activityPayload.url = streamUrl;
      }

      await client.user.setPresence({
        activities: [activityPayload],
        status: presenceStatus
      });

      const successEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          `<:check:1457808518848581858> <:arrows:1457808531678957784> **Updated bot status**`,
          '',
          `> **Presence:** \`${presenceStatus}\``,
          `> **Type:** \`${typeArg}\``,
          ...(typeArg === 'streaming' ? [`> **URL:** \`${streamUrl}\``] : []),
          `> **Text:** \`${statusText}\``
        ].join('\n'));

      return message.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error('Failed to update bot status:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to update bot status.');

      return message.reply({ embeds: [errorEmbed] });
    }
  }
};


