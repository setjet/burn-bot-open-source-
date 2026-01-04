const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'roles',
  category: 'utilities', 
  description: '<:arrows:1363099226375979058> View all roles in the server.',
  async execute(message, args) {
    const roles = message.guild.roles.cache
      .sort((a, b) => b.position - a.position) 
      .map(role => `<@&${role.id}>`);

    if (roles.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> No roles found in this server.');
      return message.reply({ embeds: [embed] });
    }

    const totalPages = Math.ceil(roles.length / 10);
    let currentPage = 1;

    const generateEmbed = () => {
      const startIdx = (currentPage - 1) * 10;
      const endIdx = startIdx + 10;
      const pageRoles = roles.slice(startIdx, endIdx);

      const roleList = pageRoles.length > 0
        ? pageRoles
            .map((role, idx) => `\`${startIdx + idx + 1}\` ${role}`)
            .join('\n')
        : 'No roles in this page.';

      return new EmbedBuilder()
        .setColor('#838996')
        .setTitle(`Roles in ${message.guild.name} (${roles.length})`)
        .setDescription(roleList)
        .setFooter({ text: `Page ${currentPage}/${totalPages}` });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setEmoji('1363819173792321576')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('next')
        .setEmoji('1363819150169866250')
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
