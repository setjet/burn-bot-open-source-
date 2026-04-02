const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { dbHelpers } = require('../../db');

// confirm buttons because someone always fat-fingers a million coins 😭

module.exports = {
  name: 'pay',
  aliases: ['transfer', 'give'],
  category: 'utilities',
  description: '<:arrows:1457808531678957784> Send money to another user.',
  async execute(message, args, { prefix }) {
    if (args.length < 2) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}pay <user> <amount>\`\`\``,
              '-# <:arrows:1457808531678957784> Send money to another user.',
              '',
              `**Example:** \`${prefix}pay @luca 1000\``,
              '\n**Aliases:** `transfer`, `give`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    // User search logic (same as balance command)
    const userInput = args[0];
    let targetUser = null;
    
    // Try to get user from mention first
    const mention = message.mentions.users.first();
    if (mention) {
      targetUser = mention;
    } else if (/^\d{17,19}$/.test(userInput)) {
      // Try to fetch by ID (works globally for any Discord user)
      try {
        targetUser = await message.client.users.fetch(userInput);
      } catch (error) {
        if (error.code === 10013) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User with ID \`${userInput}\` not found.`)
            ],
            allowedMentions: { repliedUser: false }
          }).catch(() => {});
        }
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Could not fetch user.`)
          ],
          allowedMentions: { repliedUser: false }
        }).catch(() => {});
      }
    } else {
      // Try to find by username, display name, or nickname in the server
      // Search in cache first (avoids rate limits)
      let member = message.guild.members.cache.find(m => 
        m.user.username.toLowerCase() === userInput.toLowerCase() ||
        m.user.tag.toLowerCase() === userInput.toLowerCase() ||
        (m.nickname && m.nickname.toLowerCase() === userInput.toLowerCase()) ||
        m.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
        (m.nickname && m.nickname.toLowerCase().includes(userInput.toLowerCase()))
      );
      
      if (member) {
        targetUser = member.user;
      } else {
        // Try fetching all members and searching (may cause rate limits but more reliable)
        try {
          const members = await message.guild.members.fetch().catch(() => null);
          if (members) {
            member = members.find(m => 
              m.user.username.toLowerCase() === userInput.toLowerCase() ||
              m.user.tag.toLowerCase() === userInput.toLowerCase() ||
              (m.nickname && m.nickname.toLowerCase() === userInput.toLowerCase()) ||
              m.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
              (m.nickname && m.nickname.toLowerCase().includes(userInput.toLowerCase()))
            );
            if (member) {
              targetUser = member.user;
            }
          }
        } catch (error) {
          // Fetch failed, continue to error message
        }
        
        if (!member) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${userInput}\` not found in this server.\n-# <:tree:1457808523986731008> Try using a **mention** (\`@user\`) or **user ID** for global search.`)
            ],
            allowedMentions: { repliedUser: false }
          }).catch(() => {});
        }
      }
    }
    
    if (!targetUser) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${userInput}\` not found.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    if (targetUser.id === message.author.id) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You can't pay yourself.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Please provide a **valid amount** greater than **0**.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    const senderBalance = dbHelpers.getBalance(message.author.id);
    if (senderBalance < amount) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You don't have enough **money**!`,
              `-# <:tree:1457808523986731008> Your balance: **\`$${senderBalance.toLocaleString()}\`**`
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }
    
    // If amount is above 1,000,000, ask for confirmation
    if (amount > 1000000) {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription([
          `<:alert:1457808529200119880> <:arrows:1457808531678957784> **__Confirm Large Payment__**`,
          '',
          `You are about to send **$${amount.toLocaleString()}** to <@${targetUser.id}>`,
          '',
          `<:leese:1457834970486800567> Your current balance: **\`$${senderBalance.toLocaleString()}\`**`,
          `<:tree:1457808523986731008> Balance after payment: **\`$${(senderBalance - amount).toLocaleString()}\`**`,
          '',
          `-# <:arrows:1457808531678957784> **Warning:** This action **cannot** be undone.`
        ].join('\n'));
      
      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('pay_confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('pay_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      const confirmMessage = await message.reply({ 
        embeds: [confirmEmbed],
        components: [confirmRow],
        allowedMentions: { repliedUser: false }
      });
      
      const collector = confirmMessage.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === message.author.id,
        time: 60000 // 60 seconds
      });
      
      collector.on('collect', async (interaction) => {
        if (interaction.customId === 'pay_confirm') {
          // Double-check balance hasn't changed
          const currentBalance = dbHelpers.getBalance(message.author.id);
          if (currentBalance < amount) {
            await interaction.update({
              embeds: [
                new EmbedBuilder()
                  .setColor('#838996')
                  .setDescription([
                    `<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You don't have enough money!`,
                    `-# <:tree:1457808523986731008> Your balance: **\`$${currentBalance.toLocaleString()}\`**`
                  ].join('\n'))
              ],
              components: []
            });
            return;
          }
          
          // Transfer money
          const targetBalance = dbHelpers.getBalance(targetUser.id);
          dbHelpers.setBalance(message.author.id, currentBalance - amount);
          dbHelpers.setBalance(targetUser.id, targetBalance + amount);
          
          const newSenderBalance = dbHelpers.getBalance(message.author.id);
          
          const successEmbed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              `<:check:1457808518848581858> <:arrows:1457808531678957784> Sent **$${amount.toLocaleString()}** to <@${targetUser.id}>`,
              `-# <:tree:1457808523986731008> Your new balance: **\`$${newSenderBalance.toLocaleString()}\`**`
            ].join('\n'));
          
          await interaction.update({
            embeds: [successEmbed],
            components: []
          });
        } else if (interaction.customId === 'pay_cancel') {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> Payment **cancelled**.`)
            ],
            components: []
          });
        }
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          try {
            await confirmMessage.edit({
              components: []
            });
          } catch (error) {
            // Message might have been deleted or edited
          }
        }
      });
      
      return;
    }
    
    // Transfer money (for amounts <= 1,000,000, no confirmation needed)
    const targetBalance = dbHelpers.getBalance(targetUser.id);
    
    dbHelpers.setBalance(message.author.id, senderBalance - amount);
    dbHelpers.setBalance(targetUser.id, targetBalance + amount);
    
    const newSenderBalance = dbHelpers.getBalance(message.author.id);
    
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        `<:check:1457808518848581858> <:arrows:1457808531678957784> Sent **$${amount.toLocaleString()}** to <@${targetUser.id}>`,
        `-# <:tree:1457808523986731008> Your new balance: **\`$${newSenderBalance.toLocaleString()}\`**`
      ].join('\n'));
    
    return message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};

