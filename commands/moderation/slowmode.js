const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'slowmode',
  aliases: ['sm'],
  category: 'Moderation', 
  description: '<:arrows:1457808531678957784> Set a slowmode for a channel.',
  async execute(message, args, { prefix }) {
    
    if (!message.guild) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This command can only be used in servers.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }


    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** permission to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> I need **Manage Channels** permission to set slowmode.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }


    if (args.length < 1) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}slowmode <duration>\`\`\``,
              '-# <:arrows:1457808531678957784> Set slowmode for the current channel.',
              '',
              `**Example:** \`${prefix}slowmode 10m\``,
              '\n**Aliases:** `sm`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }


    const timeString = args[0].toLowerCase();
    let seconds = 0;


    const timeValue = parseFloat(timeString);
    if (isNaN(timeValue)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid duration format. Use examples like `30s`, `5m`, or `1h`.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (timeString.endsWith('h')) {
      seconds = timeValue * 3600;
    } else if (timeString.endsWith('m')) {
      seconds = timeValue * 60; 
    } else if (timeString.endsWith('s') || !isNaN(timeString)) {
      seconds = timeValue; 
    } else {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid time unit. Use `s` **(seconds)**, `m` **(minutes)**, or `h` **(hours)**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }


    if (seconds < 0 || seconds > 21600) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Duration must be between `0` and `21600` seconds **(6 hours)**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    try {

      await message.channel.setRateLimitPerUser(seconds);


      let durationDisplay;
      if (seconds >= 3600) {
        const hours = seconds / 3600;
        durationDisplay = `${hours.toFixed(1)} hour${hours !== 1 ? 's' : ''}`;
      } else if (seconds >= 60) {
        const minutes = seconds / 60;
        durationDisplay = `${minutes.toFixed(1)} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        durationDisplay = `${seconds} second${seconds !== 1 ? 's' : ''}`;
      }


      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(seconds === 0 
          ? '<:clocc:1363116575757963324> <:arrows:1457808531678957784>  **Slowmode disabled**' 
          : `<:clocc:1363116575757963324> <:arrows:1457808531678957784> **Slowmode set to** \`${durationDisplay}\``
        );

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Slowmode error:', error);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to set slowmode. Please try again.');
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};