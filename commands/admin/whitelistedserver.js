const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../storedata.json');

const loadData = () => {
  if (!fs.existsSync(dataPath)) {
    return { serverWhitelists: {} };
  }

  const savedData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(savedData);
};

module.exports = {
  name: 'whitelistserver',
  aliases: ['ws'],
  category: 'admin',
  async execute(message, args) {
    // Only allow in specific server
    if (message.guild?.id !== '1455305225081589843') return;
    
    if (message.author.id !== '758522527885951016') return;

    const data = loadData();
    const serverWhitelists = data.serverWhitelists || {};
    const whitelistedServerIds = Object.keys(serverWhitelists).filter(
      (id) => serverWhitelists[id] === true
    );

    if (whitelistedServerIds.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setTitle('No Whitelisted Servers')
            .setDescription('There are currently no servers whitelisted.')
        ]
      });
    }

    const serverInfo = await Promise.all(
      whitelistedServerIds.map(async (serverId) => {
        try {
          const guild = await message.client.guilds.fetch(serverId);
          return { name: guild.name, id: serverId };
        } catch {
          return { name: 'Unavailable or bot not in server', id: serverId };
        }
      })
    );

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription('Servers that are currently whitelisted:')
      .addFields(
        serverInfo.map((server) => ({
          name: server.name,
          value: `ID: ${server.id}`,
          inline: false
        }))
      );

    message.reply({ embeds: [embed] });
  }
};
