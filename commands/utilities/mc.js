const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'mc',
  description: '<:arrows:1457808531678957784> Show server member count.',
  category: 'utilities',
  async execute(message) {
    const guild = message.guild;
    if (!guild) return message.reply({ content: 'This command can only be used in a server.', allowedMentions: { repliedUser: false } });


    const fetchedMembers = await guild.members.fetch();
    const bots = fetchedMembers.filter(member => member.user.bot).size;
    const humans = fetchedMembers.filter(member => !member.user.bot).size;
    const total = fetchedMembers.size;

    const embed = new EmbedBuilder()
      .setTitle(`Server Statistics for ${guild.name}`)
      .setColor('#838996')
      .addFields(
        { name: 'Total', value: `${total}`, inline: true },
        { name: 'Humans', value: `${humans}`, inline: true },
        { name: 'Bots', value: `${bots}`, inline: true }
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      
    message.channel.send({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
