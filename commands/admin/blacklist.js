const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ADMIN_ROLE_ID = '1335244346382880829';
const dataFile = path.join(__dirname, '../../storedata.json');

function getStoreData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      // Ensure required fields exist
      if (!data.blacklistedUsers) data.blacklistedUsers = [];
      if (!data.spamWarnings) data.spamWarnings = {};
      return data;
    }
  } catch (error) {
    console.error('Error reading storedata.json:', error);
  }
  return { blacklistedUsers: [], spamWarnings: {} };
}

function saveStoreData(data) {
  try {
    // Read existing data to preserve other fields
    let existingData = {};
    if (fs.existsSync(dataFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      } catch (e) {
        // If read fails, use empty object
      }
    }
    
    // Merge with existing data
    const mergedData = { ...existingData, ...data };
    
    fs.writeFileSync(dataFile, JSON.stringify(mergedData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving storedata.json:', error);
  }
}

module.exports = {
  name: 'blacklist',
  aliases: ['bl'],
  category: 'admin',
  description: '<:arrows:1363099226375979058> Manage the bot blacklist (Admin only).',
  async execute(message, args, { prefix }) {
    // Only allow in specific server
    if (message.guild?.id !== '1455305225081589843') return;
    
    // Check if user has admin role
    if (!message.member || !message.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need the **admin role** to use this command.')
        ]
      });
    }

    if (!args.length) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}blacklist add <user>\`\`\``,
              `\`\`\`${prefix}blacklist remove <user>\`\`\``,
              `\`\`\`${prefix}blacklist list\`\`\``,
              '-# <:arrows:1363099226375979058> Add or remove users from the blacklist, or view all blacklisted users.',
              '',
              `**Examples:**`,
              `\`${prefix}blacklist add @user\``,
              `\`${prefix}blacklist remove @user\``,
              `\`${prefix}blacklist list\``,
              '\n**Aliases:** `bl`'
            ].join('\n'))
        ]
      });
    }

    const subcommand = args[0].toLowerCase();
    const storeData = getStoreData();

    if (subcommand === 'add') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a user to add to the blacklist.\n\`\`\`${prefix}blacklist add <user>\`\`\``)
          ]
        });
      }

      const userInput = args[1];
      let userId;

      // Check if it's a mention
      if (userInput.startsWith('<@') && userInput.endsWith('>')) {
        userId = userInput.slice(2, -1).replace('!', '');
      } else if (/^\d{17,19}$/.test(userInput)) {
        userId = userInput;
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid user format. Please mention a user or provide a user ID.`)
          ]
        });
      }

      // Check if user has admin role (can't blacklist admins)
      try {
        const targetMember = await message.guild.members.fetch(userId).catch(() => null);
        if (targetMember && targetMember.roles.cache.has(ADMIN_ROLE_ID)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Cannot blacklist users with the **admin role**.`)
            ]
          });
        }
      } catch (error) {
        // If user is not in this server, continue with blacklisting
      }

      if (!storeData.blacklistedUsers || !Array.isArray(storeData.blacklistedUsers)) {
        storeData.blacklistedUsers = [];
      }

      if (storeData.blacklistedUsers.includes(userId)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User <@${userId}> is already blacklisted.`)
          ]
        });
      }

      // Add to blacklist
      storeData.blacklistedUsers.push(userId);

      // Save only the fields we're updating to preserve other data
      const dataToSave = getStoreData();
      dataToSave.blacklistedUsers = storeData.blacklistedUsers;
      saveStoreData(dataToSave);

      // Send blacklist report
      const { EmbedBuilder: EmbedBuilderMain } = require('discord.js');
      const logChannel = await message.client.channels.fetch('1456289917352017941').catch(() => null);
      if (logChannel) {
        let targetUser;
        try {
          targetUser = await message.client.users.fetch(userId);
        } catch (error) {
          targetUser = { id: userId, tag: 'Unknown User', username: 'Unknown', discriminator: '0000' };
        }

        const reportEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('User Blacklisted')
          .setThumbnail(targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null)
          .addFields(
            { name: 'User', value: `<@${userId}> (${targetUser.tag || `${targetUser.username}#${targetUser.discriminator || '0000'}`})`, inline: true },
            { name: 'User ID', value: `\`${userId}\``, inline: true },
            { name: 'Reason', value: '👤 Manually blacklisted by developer', inline: true },
            { name: 'Blacklisted By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Server', value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true }
          )

        await logChannel.send({ embeds: [reportEmbed] }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Added** <@${userId}> to the blacklist.`)
        ]
      });
    }

    if (subcommand === 'remove' || subcommand === 'unblacklist') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a user to remove from the blacklist.\n\`\`\`${prefix}blacklist remove <user>\`\`\``)
          ]
        });
      }

      const userInput = args[1];
      let userId;

      // Check if it's a mention
      if (userInput.startsWith('<@') && userInput.endsWith('>')) {
        userId = userInput.slice(2, -1).replace('!', '');
      } else if (/^\d{17,19}$/.test(userInput)) {
        userId = userInput;
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid user format. Please mention a user or provide a user ID.`)
          ]
        });
      }

      if (!storeData.blacklistedUsers || !Array.isArray(storeData.blacklistedUsers)) {
        storeData.blacklistedUsers = [];
      }

      // Check if user is in permanent blacklist or has temporary blacklist
      const isPermanentlyBlacklisted = storeData.blacklistedUsers && storeData.blacklistedUsers.includes(userId);
      const hasTemporaryBlacklist = storeData.blacklistLevels && storeData.blacklistLevels[userId];
      
      if (!isPermanentlyBlacklisted && !hasTemporaryBlacklist) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User <@${userId}> is not blacklisted.`)
          ]
        });
      }

      // Remove from blacklist (both permanent and temporary)
      if (isPermanentlyBlacklisted) {
        storeData.blacklistedUsers = storeData.blacklistedUsers.filter(id => id !== userId);
      }
      
      // Also clear spam warnings, blacklist levels, and expirations
      if (storeData.spamWarnings && storeData.spamWarnings[userId]) {
        delete storeData.spamWarnings[userId];
      }
      if (storeData.blacklistLevels && storeData.blacklistLevels[userId]) {
        delete storeData.blacklistLevels[userId];
      }
      if (storeData.blacklistExpirations && storeData.blacklistExpirations[userId]) {
        delete storeData.blacklistExpirations[userId];
      }

      // Save only the fields we're updating to preserve other data
      const dataToSave = getStoreData();
      dataToSave.blacklistedUsers = storeData.blacklistedUsers;
      dataToSave.spamWarnings = storeData.spamWarnings;
      if (dataToSave.blacklistLevels) {
        dataToSave.blacklistLevels[userId] = undefined;
        delete dataToSave.blacklistLevels[userId];
      }
      if (dataToSave.blacklistExpirations) {
        dataToSave.blacklistExpirations[userId] = undefined;
        delete dataToSave.blacklistExpirations[userId];
      }
      saveStoreData(dataToSave);

      // Send blacklist removal report
      const logChannel = await message.client.channels.fetch('1456289917352017941').catch(() => null);
      if (logChannel) {
        let targetUser;
        try {
          targetUser = await message.client.users.fetch(userId);
        } catch (error) {
          targetUser = { id: userId, tag: 'Unknown User', username: 'Unknown', discriminator: '0000' };
        }

        const reportEmbed = new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('User Removed from Blacklist')
          .setThumbnail(targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null)
          .addFields(
            { name: 'User', value: `<@${userId}> (${targetUser.tag || `${targetUser.username}#${targetUser.discriminator || '0000'}`})`, inline: true },
            { name: 'User ID', value: `\`${userId}\``, inline: true },
            { name: 'Removed By', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: 'Server', value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true }
          )

        await logChannel.send({ embeds: [reportEmbed] }).catch(() => {});
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> **Removed** <@${userId}> from the blacklist.`)
        ]
      });
    }

    if (subcommand === 'list') {
      if (!storeData.blacklistedUsers || storeData.blacklistedUsers.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:arrows:1363099226375979058> No users are currently blacklisted.')
          ]
        });
      }

      const blacklistedUsers = storeData.blacklistedUsers;
      const userList = blacklistedUsers.map(id => `<@${id}>`).join('\n') || 'None';

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('Blacklisted Users')
        .setDescription(userList.length > 4096 ? userList.slice(0, 4093) + '...' : userList)
        .setFooter({ text: `Total: ${blacklistedUsers.length} user(s)` });

      return message.reply({ embeds: [embed] });
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid subcommand. Use \`add\`, \`remove\`, or \`list\`.`)
      ]
    });
  }
};

