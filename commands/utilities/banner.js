const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'banner',
  aliases: ['bn', 'sb'],
  description: '<:arrows:1363099226375979058> View a user banner',
  category: 'utilities',
  async execute(message, args, { getUser }) {
    const commandUsed = message.content.slice(1).split(/\s+/)[0].toLowerCase();
    const isServerBanner = commandUsed === 'sb';

    let target;
    if (!args[0]) {
      target = message.author;
    } else {
      const input = args.join(' ');
      const mention = message.mentions.users.first();
      const byIdOrUsername = await getUser(message, input);
      const byDisplayName = message.guild.members.cache.find(m =>
        m.displayName.toLowerCase() === input.toLowerCase()
      );

      target = mention || byIdOrUsername || (byDisplayName ? byDisplayName.user : null);

      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> User \`${input}\` not found.`)
          ]
        });
      }
    }

    if (isServerBanner) {
      const member = await message.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription("<:excl:1362858572677120252> <:arrows:1363099226375979058> User is not in this server.")
          ]
        });
      }

      const bannerUrl = member.bannerURL({ dynamic: true, size: 4096 });

      if (!bannerUrl) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> ${target.id === message.author.id ? "You don't" : "This user doesn't"} have a **server banner**.`)
          ]
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle(`${member.displayName}'s Server Banner`)
        .setDescription(`[Click here to view](${bannerUrl})`)
        .setImage(bannerUrl)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL()
        });

      return message.reply({ embeds: [embed] });
    }

    try {
      const user = await message.client.users.fetch(target.id, { force: true });
      const bannerUrl = user.bannerURL({ dynamic: true, size: 4096 });

      if (!bannerUrl) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> ${target.id === message.author.id ? "You don't" : "This user doesn't"} have a **profile banner**.`)
          ]
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle(`${user.tag}'s Banner`)
        .setDescription(`[Click here to view](${bannerUrl})`)
        .setImage(bannerUrl)
        .setFooter({
          text: `${message.author.tag}`,
          iconURL: message.author.displayAvatarURL()
        });

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching banner:', error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription("<:excl:1362858572677120252> <:arrows:1363099226375979058> Couldn't fetch the profile banner.")
        ]
      });
    }
  }
};
