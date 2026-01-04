const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'inrole',
  aliases: ['ir'],
  description: '<:arrows:1363099226375979058> Show members in a specified role.',
  category: 'utilities',
  async execute(message, args) {
   
    let role;
    if (!args[0]) {
      
      const member = await message.guild.members.fetch(message.author.id);
      role = member.roles.highest;
      if (!role) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription("❌ You don't have any roles to check.");
        return message.reply({ embeds: [embed] });
      }
    } else {

      role = message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[0]) ||
        message.guild.roles.cache.find(r => r.name.toLowerCase().includes(args.join(' ').toLowerCase()));
    }

    if (!role) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('❌ Role not found. Please mention the role or use its exact name.');
      return message.reply({ embeds: [embed] });
    }

    
    const members = [];
    const fetchedMembers = await message.guild.members.fetch();
    fetchedMembers.forEach(member => {
      if (member.roles.cache.has(role.id)) {
        members.push(member.user);
      }
    });

    const totalPages = Math.ceil(members.length / 10);
    let currentPage = 1;

    
    const generateEmbed = () => {
      const startIdx = (currentPage - 1) * 10;
      const endIdx = startIdx + 10;
      const pageMembers = members.slice(startIdx, endIdx);

      const memberList = pageMembers.length > 0
        ? pageMembers
            .map((member, idx) => `\`${startIdx + idx + 1}\` <@${member.id}> (\`${member.id}\`)`)
            .join('\n')
        : 'No members in this role.';

      return new EmbedBuilder()
        .setColor(role.color || '#838996')
        .setTitle(`Users in ${role.name} (${members.length})`)
        .setDescription(memberList)
        .setFooter({ text: `Page ${currentPage}/${totalPages}` });
    };


    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages)
    );


    const reply = await message.reply({ 
      embeds: [generateEmbed()], 
      components: totalPages > 1 ? [row] : []
    });


    if (totalPages > 1) {
      const collector = reply.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
          return i.reply({
            content: "You can't interact with this embed.",
            ephemeral: true
          });
        }

        if (i.customId === 'prev' && currentPage > 1) {
          currentPage--;
        } else if (i.customId === 'next' && currentPage < totalPages) {
          currentPage++;
        }

        row.components[0].setDisabled(currentPage === 1);
        row.components[1].setDisabled(currentPage === totalPages);

        await i.update({
          embeds: [generateEmbed()],
          components: [row]
        });
      });

      collector.on('end', () => {
        reply.edit({ components: [] }).catch(() => {});
      });
    }
  }
};
