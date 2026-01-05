const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dbHelpers } = require('../../db');

module.exports = {
  name: 'shop',
  aliases: ['store'],
  category: 'utilities',
  description: '<:arrows:1363099226375979058> Manage and view the server shop.',
  async execute(message, args, { prefix }) {
    const subcommand = args[0]?.toLowerCase();
    const guildId = message.guild.id;
    
    if (!subcommand || subcommand === 'view' || subcommand === 'list') {
      const items = dbHelpers.getShopItems(guildId);
      
      if (items.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:arrows:1363099226375979058> The shop is empty. Use `add` to add items (Admin only).')
          ]
        });
      }
      
      const itemList = items.map((item, index) => {
        const roleMention = item.roleId ? `<@&${item.roleId}>` : 'N/A';
        return `\`${index + 1}\` **${item.name}** - \`${item.price.toLocaleString()}\` coins\n   ${roleMention}${item.description ? `\n   ${item.description}` : ''}`;
      }).join('\n\n');
      
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle(`🛒 Shop - ${message.guild.name}`)
        .setDescription(itemList)
        .setFooter({ text: `Use ${prefix}shop buy <number> to purchase an item` });
      
      return message.reply({ embeds: [embed] });
    }
    
    if (subcommand === 'add') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to add shop items.')
          ]
        });
      }
      
      if (args.length < 3) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                '<:settings:1362876382375317565> **Usage:**',
                `\`\`\`${prefix}shop add <name> <price> <role> [description]\`\`\``,
                '-# <:arrows:1363099226375979058> Add an item to the shop.',
                '',
                `**Example:** \`${prefix}shop add VIP Role 5000 @VIP Premium membership\``,
                '\n**Aliases:** `store`'
              ].join('\n'))
          ]
        });
      }
      
      const name = args[1];
      const price = parseInt(args[2]);
      
      if (isNaN(price) || price <= 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a valid price greater than 0.`)
          ]
        });
      }
      
      const roleInput = args[3];
      let role;
      
      if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
        const roleId = roleInput.slice(3, -1);
        role = message.guild.roles.cache.get(roleId);
      } else if (/^\d{17,19}$/.test(roleInput)) {
        role = message.guild.roles.cache.get(roleInput);
      } else {
        role = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleInput.toLowerCase()));
      }
      
      if (!role) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Role not found.`)
          ]
        });
      }
      
      const description = args.slice(4).join(' ') || '';
      
      const newItem = {
        name,
        price,
        roleId: role.id,
        description
      };
      
      const currentItems = dbHelpers.getShopItems(guildId);
      currentItems.push(newItem);
      dbHelpers.setShopItems(guildId, currentItems);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> Added **${name}** to the shop for **${price.toLocaleString()}** coins.`)
        ]
      });
    }
    
    if (subcommand === 'remove' || subcommand === 'delete') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> You need **Administrator** permissions to remove shop items.')
          ]
        });
      }
      
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide an item number to remove.\n\`\`\`${prefix}shop remove <number>\`\`\``)
          ]
        });
      }
      
      const index = parseInt(args[1]) - 1;
      const items = dbHelpers.getShopItems(guildId);
      
      if (isNaN(index) || index < 0 || index >= items.length) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid item number.`)
          ]
        });
      }
      
      const removedItem = items[index];
      items.splice(index, 1);
      dbHelpers.setShopItems(guildId, items);
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> Removed **${removedItem.name}** from the shop.`)
        ]
      });
    }
    
    if (subcommand === 'buy' || subcommand === 'purchase') {
      if (args.length < 2) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide an item number to buy.\n\`\`\`${prefix}shop buy <number>\`\`\``)
          ]
        });
      }
      
      const index = parseInt(args[1]) - 1;
      const items = dbHelpers.getShopItems(guildId);
      
      if (isNaN(index) || index < 0 || index >= items.length) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Invalid item number.`)
          ]
        });
      }
      
      const item = items[index];
      const balance = dbHelpers.getBalance(message.author.id);
      
      if (balance < item.price) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription([
                `<:excl:1362858572677120252> <:arrows:1363099226375979058> You don't have enough coins!`,
                `-# Your balance: **${balance.toLocaleString()}** coins`,
                `-# Required: **${item.price.toLocaleString()}** coins`
              ].join('\n'))
          ]
        });
      }
      
      // Check if user already has the role
      const member = message.member;
      if (member.roles.cache.has(item.roleId)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> You already have <@&${item.roleId}>!`)
          ]
        });
      }
      
      // Check if bot can manage the role
      const botMember = await message.guild.members.fetchMe();
      const role = message.guild.roles.cache.get(item.roleId);
      if (!role) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> The role for this item no longer exists.`)
          ]
        });
      }
      
      if (role.position >= botMember.roles.highest.position) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> I can't assign <@&${item.roleId}> because it's higher than my highest role.`)
          ]
        });
      }
      
      // Deduct money and assign role
      const newBalance = balance - item.price;
      dbHelpers.setBalance(message.author.id, newBalance);
      
      try {
        await member.roles.add(role, `Purchased from shop: ${item.name}`);
        
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setDescription([
            `<:check:1362850043333316659> <:arrows:1363099226375979058> **Purchase Successful**`,
            '',
            `Purchased **${item.name}**!`,
            `You received <@&${item.roleId}>`,
            '',
            `Your new balance: **${newBalance.toLocaleString()}** coins`
          ].join('\n'));
        
        return message.reply({ embeds: [embed] });
      } catch (error) {
        // Refund if role assignment fails
        dbHelpers.setBalance(message.author.id, balance);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to assign role. Your coins have been refunded.`)
          ]
        });
      }
    }
    
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#838996')
          .setDescription([
            '<:settings:1362876382375317565> **Usage:**',
            `\`\`\`${prefix}shop view\`\`\``,
            `\`\`\`${prefix}shop buy <number>\`\`\``,
            `\`\`\`${prefix}shop add <name> <price> <role> [description]\`\`\` (Admin)`,
            `\`\`\`${prefix}shop remove <number>\`\`\` (Admin)`,
            '-# <:arrows:1363099226375979058> View, buy, or manage shop items.',
            '\n**Aliases:** `store`'
          ].join('\n'))
      ]
    });
  }
};

