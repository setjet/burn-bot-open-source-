const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

function countLinesInDirectory(dir) {
  let totalLines = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      totalLines += countLinesInDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      totalLines += fileContent.split('\n').length;
    }
  }

  return totalLines;
}

function safeCountLines() {
  const projectRoot = path.join(__dirname, '../');
  const allowedFolders = ['commands'];
  const allowedFiles = ['index.js'];
  let totalLines = 0;

  for (const item of allowedFolders) {
    const fullPath = path.join(projectRoot, item);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      totalLines += countLinesInDirectory(fullPath);
    }
  }

  for (const file of allowedFiles) {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      totalLines += fileContent.split('\n').length;
    }
  }

  return totalLines;
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
  name: 'botinformation',
  aliases: ['bi'],
  category: ['miscellaneous'],
  description: ['<:arrows:1363099226375979058> View information about this bot.'],
  async execute(message) {
    try {
      const client = message.client;
      const totalGuilds = client.guilds.cache.size;
      const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      const linesOfCode = safeCountLines();
      const uptime = formatUptime(client.uptime);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Bot Information')
        .addFields(
          { name: 'Servers', value: `${totalGuilds}`, inline: true },
          { name: 'Users Managing', value: `${totalUsers}`, inline: true },
          { name: 'Uptime', value: uptime, inline: true },
          { name: '', value: '-# by [@fwjet](https://discord.com/users/1448417272631918735)', inline: true }
        )
        .setFooter({ text: '\nburn v1.0.0', iconURL: client.user.displayAvatarURL() });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Botinformation command error:', error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF4D4D')
            .setDescription([
              '<:excl:1362858572677120252> <:arrows:1363099226375979058> **Error fetching bot information.**',
            ].join('\n'))
        ]
      }).catch(() => {});
    }
  }
};
