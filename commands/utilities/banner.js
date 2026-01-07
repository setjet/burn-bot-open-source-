const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'banner',
  aliases: ['bn', 'sb'],
  description: '<:arrows:1457808531678957784> View a user banner',
  category: 'utilities',
  async execute(message, args, { getUser }) {
    const commandUsed = message.content.slice(1).split(/\s+/)[0].toLowerCase();
    const isServerBanner = commandUsed === 'sb';

    let target;
    if (!args[0]) {
      target = message.author;
    } else {
      const input = args.join(' ');
      target = await getUser(message, input);

      if (!target) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User \`${input}\` not found.`)
          ],
          allowedMentions: { repliedUser: false }
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
              .setDescription("<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User is not in this server.")
          ],
          allowedMentions: { repliedUser: false }
        });
      }

      const bannerUrl = member.bannerURL({ dynamic: true, size: 4096 });

      if (!bannerUrl) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> ${target.id === message.author.id ? "You don't" : "This user doesn't"} have a **server banner**.`)
          ],
          allowedMentions: { repliedUser: false }
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

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    try {
      const user = await message.client.users.fetch(target.id, { force: true });
      const bannerUrl = user.bannerURL({ dynamic: true, size: 4096 });

      if (!bannerUrl) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> ${target.id === message.author.id ? "You don't" : "This user doesn't"} have a **profile banner**.`)
          ],
          allowedMentions: { repliedUser: false }
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

      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Error fetching banner:', error);
      let errorMessage = "<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Couldn't fetch the profile banner.";
      
      if (error.code === 10013) {
        errorMessage = "<:disallowed:1457808577786806375> <:arrows:1457808531678957784> User not found.";
      } else if (error.code === 50035 || error.message?.includes('rate limit')) {
        errorMessage = "<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Rate limited. Please try again in a few seconds.";
      }
      
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription(errorMessage)
        ],
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
