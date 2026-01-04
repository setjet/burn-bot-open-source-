const { EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../storedata.json');

const WHITELIST_ROLE_NAME = 'Staff';
const LOG_CHANNEL_ID = '1362348260043391176';

const loadData = () => {
  if (!fs.existsSync(dataPath)) {
    return { serverWhitelists: {} };
  }
  const savedData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(savedData);
};

const saveDataToFile = (data) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

module.exports = {
  name: 'serverwhitelist',
  aliases: ['sw'],
  category: 'admin',
  async execute(message, args, { serverWhitelists, client, prefix }) {
    // Only allow in specific server
    if (message.guild?.id !== '1455305225081589843') return;
    
    const hasRole = message.member.roles.cache.some(
      role => role.name === WHITELIST_ROLE_NAME
    );
    if (!hasRole) return;

    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}sw add <server id>\`\`\``,
              `\`\`\`${prefix}sw remove <server id>\`\`\``,
              '-# <:arrows:1363099226375979058> Add or remove a server from the **whitelist**.',
            ].join('\n'))
        ]
      });
    }

    const action = args[0].toLowerCase();
    const serverID = args[1];

    if (!/^\d{17,19}$/.test(serverID)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid **server ID** format. Must be 17-19 digits.')
        ]
      });
    }

    if (action === 'add') {
      if (serverWhitelists.has(serverID)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Server is already **whitelisted**.')
          ]
        });
      }

      // Update in-memory Map
      serverWhitelists.set(serverID, true);
      
      // Update file
      const data = loadData();
      if (!data.serverWhitelists) data.serverWhitelists = {};
      data.serverWhitelists[serverID] = true;
      saveDataToFile(data);

      console.log(`Server ${serverID} added to whitelist. Current whitelist:`, Array.from(serverWhitelists.keys()));

      const logEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('Server Added to Whitelist')
        .addFields(
          { name: 'Whitelisted By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
          { name: 'Server ID', value: serverID, inline: true }
        )

      const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) logChannel.send({ embeds: [logEmbed] }).catch(() => {});

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> \`${serverID}\` has been **added** to the whitelist. **burn** can now join this server.`)
        ]
      });
    }

    if (action === 'remove') {
      if (!serverWhitelists.has(serverID)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Server is not currently **whitelisted**.')
          ]
        });
      }

      // Update in-memory Map
      serverWhitelists.delete(serverID);
      
      // Update file
      const data = loadData();
      if (data.serverWhitelists && data.serverWhitelists[serverID]) {
        delete data.serverWhitelists[serverID];
        saveDataToFile(data);
      }

      console.log(`Server ${serverID} removed from whitelist. Current whitelist:`, Array.from(serverWhitelists.keys()));

      const logEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Server Removed from Whitelist')
        .addFields(
          { name: 'Removed By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
          { name: 'Server ID', value: serverID, inline: true }
        )

      const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) logChannel.send({ embeds: [logEmbed] }).catch(() => {});

      // Leave the server immediately if bot is in it
      const guild = client.guilds.cache.get(serverID);
      if (guild) {
        try {
          // Send message before leaving
          const targetChannel = guild.systemChannel || guild.channels.cache.find(channel =>
            channel.type === ChannelType.GuildText && channel.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']));
          
          if (targetChannel) {
            const leaveEmbed = new EmbedBuilder()
              .setColor('#FF0000')
              .setDescription('<:alert:1363009864112144394> <:arrows:1363099226375979058> **Server has been unwhitelisted**')
              .addFields(
                { name: '', value: '-# This server has been removed from the whitelist. Contact **oczs** for inquiries.' }
              );
            await targetChannel.send({ embeds: [leaveEmbed] }).catch(() => {});
          }

          await guild.leave();
          console.log(`Left unwhitelisted server: ${guild.name} (${serverID})`);
        } catch (err) {
          console.error(`Failed to leave server ${serverID}:`, err);
        }
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:deleted:1363170791457427546> <:arrows:1363099226375979058> \`${serverID}\` has been **removed** from the whitelist.${guild ? ' Bot has **left** the server.' : ''}`)
        ]
      });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid action. Use `add` or `remove`.')
      ]
    });
  }
};
