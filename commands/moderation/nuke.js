const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'nuke',
  aliases: ['n'],
  category: 'moderation', 
  description: '<:arrows:1457808531678957784> Delete & create a new channel',
  async execute(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Aministrator** permissions to use this command.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const channelName = message.channel.name;
    const channelCategory = message.channel.parentId;
    const permissionOverwrites = message.channel.permissionOverwrites.cache.map(perm => ({
      id: perm.id,
      allow: perm.allow.bitfield,
      deny: perm.deny.bitfield
    }));

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription(`<:alert:1457808529200119880> <:arrows:1457808531678957784> **Are you sure you want to nuke <#${message.channel.id}>?**`)
      .addFields(
        { name: '', value: '-# This action cannot be undone.' }
      ); 

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('nuke_yes')
          .setLabel('Yes')
          .setStyle(ButtonStyle.Danger), 
        new ButtonBuilder()
          .setCustomId('nuke_no')
          .setLabel('No')
          .setStyle(ButtonStyle.Success) 
      );

    try {
      const confirmationMessage = await message.reply({
        embeds: [embed],
        components: [row],
        allowedMentions: { repliedUser: false }
      });

      const filter = i => i.user.id === message.author.id && ['nuke_yes', 'nuke_no'].includes(i.customId);
      const collector = confirmationMessage.createMessageComponentCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async interaction => {
        try {
          const response = interaction.customId;

          if (response === 'nuke_no') {
            await interaction.update({
              embeds: [new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Action **cancelled**.')
              ],
              components: []
            }).catch(() => {
             
              message.channel.send('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Action **cancelled**.').catch(() => {});
            });
            return;
          }

          try {
            await message.channel.delete('Nuked via command');
            
            const newChannel = await message.guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: channelCategory || undefined,
              permissionOverwrites: permissionOverwrites
            });

            await newChannel.send('first lol').catch(() => {});
          } catch (error) {
            console.error('Error during nuke:', error);
            
            message.channel.send('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to nuke channel.').catch(() => {});
          }
        } catch (interactionError) {
          console.error('Interaction error:', interactionError);
        }
      });

      collector.on('end', async collected => {
        try {
          if (collected.size === 0) {
            await confirmationMessage.edit({
              embeds: [new EmbedBuilder()
                .setColor('#838996')
                .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Took too long, nuke cancelled.')
              ],
              components: []
            }).catch(() => {
              
              message.channel.send('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Took too long, nuke cancelled.').catch(() => {});
            });
          }
        } catch (endError) {
          console.error('Collector end error:', endError);
        }
      });
    } catch (initialError) {
      console.error('Initial nuke command error:', initialError);
      message.reply({ content: '<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to nuke the channel.', allowedMentions: { repliedUser: false } }).catch(() => {});
    }
  }
};
