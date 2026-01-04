const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../../storedata.json');
const ADMIN_ROLE_ID = '1335244346382880829';

function getStoreData() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (!data.economy) data.economy = { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} };
      if (!data.economy.balances) data.economy.balances = {};
      return data;
    }
  } catch (error) {
    console.error('Error reading storedata.json:', error);
  }
  return { economy: { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} } };
}

function saveStoreData(data) {
  try {
    let existingData = {};
    if (fs.existsSync(dataFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      } catch (e) {}
    }
    // Deep merge economy object
    if (data.economy) {
      if (!existingData.economy) existingData.economy = { balances: {}, dailyCooldowns: {}, workCooldowns: {}, shopItems: {} };
      existingData.economy = {
        ...existingData.economy,
        ...data.economy,
        balances: { ...existingData.economy.balances, ...(data.economy.balances || {}) },
        dailyCooldowns: { ...existingData.economy.dailyCooldowns, ...(data.economy.dailyCooldowns || {}) },
        workCooldowns: { ...existingData.economy.workCooldowns, ...(data.economy.workCooldowns || {}) },
        shopItems: { ...existingData.economy.shopItems, ...(data.economy.shopItems || {}) }
      };
    }
    const mergedData = { ...existingData, ...data };
    if (data.economy) mergedData.economy = existingData.economy;
    fs.writeFileSync(dataFile, JSON.stringify(mergedData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving storedata.json:', error);
  }
}

function addBalance(userId, amount) {
  const data = getStoreData();
  if (!data.economy.balances[userId]) data.economy.balances[userId] = 0;
  data.economy.balances[userId] += amount;
  saveStoreData(data);
  return data.economy.balances[userId];
}

function getBalance(userId) {
  const data = getStoreData();
  return data.economy.balances[userId] || 0;
}

module.exports = {
  name: 'givecoins',
  aliases: ['gc', 'addcoins'],
  category: 'admin',
  description: '<:arrows:1363099226375979058> Give coins to a user (Admin only).',
  async execute(message, args, { prefix, getUser }) {
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

    // Check for reset subcommand
    if (args[0]?.toLowerCase() === 'reset') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}givecoins reset <user>\`\`\``,
                '-# <:arrows:1363099226375979058> Reset a user\'s coin balance to 0.',
                '',
                `**Example:** \`${prefix}givecoins reset @user\``
              ].join('\n'))
          ]
        });
      }

      const target = await getUser(message, args[1]);
      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[1]}\` not found.`)
          ]
        });
      }

      const oldBalance = getBalance(target.id);
      if (oldBalance === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> <@${target.id}> already has 0 coins.`)
          ]
        });
      }

      const data = getStoreData();
      data.economy.balances[target.id] = 0;
      saveStoreData(data);

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription([
          `<:check:1362850043333316659> <:arrows:1363099226375979058> **Balance Reset**`,
          '',
          `Reset <@${target.id}>'s balance to 0`,
          '',
          `**Previous balance:** \`${oldBalance.toLocaleString()}\` coins`,
          `**New balance:** \`0\` coins`
        ].join('\n'));

      return message.reply({ embeds: [embed] });
    }

    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1362876382375317565> **Usage:**',
              `\`\`\`${prefix}givecoins <user> <amount>\`\`\``,
              `\`\`\`${prefix}givecoins reset <user>\`\`\``,
              '-# <:arrows:1363099226375979058> Give coins to a user or reset their balance.',
              '',
              `**Examples:**`,
              `\`${prefix}givecoins @user 1000\``,
              `\`${prefix}givecoins reset @user\``,
              '\n**Aliases:** `gc`, `addcoins`'
            ].join('\n'))
        ]
      });
    }

    const target = await getUser(message, args[0]);
    if (!target) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${args[0]}\` not found.`)
        ]
      });
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a valid amount greater than 0.`)
        ]
      });
    }

    const oldBalance = getBalance(target.id);
    const newBalance = addBalance(target.id, amount);

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setDescription([
        `<:check:1362850043333316659> <:arrows:1363099226375979058> **Coins Given**`,
        '',
        `Gave **${amount.toLocaleString()}** coins to <@${target.id}>`,
        '',
        `**Old balance:** \`${oldBalance.toLocaleString()}\` coins`,
        `**New balance:** \`${newBalance.toLocaleString()}\` coins`
      ].join('\n'));

    return message.reply({ embeds: [embed] });
  }
};

