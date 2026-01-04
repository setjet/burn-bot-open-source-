const { EmbedBuilder } = require('discord.js');
const { description, category } = require('./clearsnipe');

module.exports = {
  name: 'avatar',
  aliases: ['av', 'sav'],
  description: '<:arrows:1363099226375979058> View a user avatar',
  category: 'utilities',
  async execute(message, args, { getUser }) {
    try {
      const commandUsed = message.content.slice(1).split(/\s+/)[0].toLowerCase();
      const isServerAvatar = commandUsed === 'sav';

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


      const member = await message.guild.members.fetch(target.id).catch(() => null);
      
      if (isServerAvatar) {
        if (!member) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription("<:excl:1362858572677120252> <:arrows:1363099226375979058> User is not in this server.")
            ]
          });
        }


        const serverAvatar = member.avatarURL({ 
          dynamic: true, 
          size: 4096,
          extension: member.avatar?.startsWith('a_') ? 'gif' : 'png'
        });

        if (!serverAvatar) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#838996')
                .setDescription("<:excl:1362858572677120252> <:arrows:1363099226375979058> This user doesn't have a server-specific avatar.")
            ]
          });
        }

        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setTitle(`${member.displayName}'s Server Avatar`)
          .setDescription(`[Click here to view](${serverAvatar})`)
          .setImage(serverAvatar)
          .setFooter({
            text: `Requested by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          });

        return message.reply({ embeds: [embed] });
      }


      const globalAvatar = target.displayAvatarURL({ 
        dynamic: true, 
        size: 4096,
        extension: target.avatar?.startsWith('a_') ? 'gif' : 'png'
      });

      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle(`${target.username}'s Avatar`)
        .setDescription(`[Click here to view](${globalAvatar})`)
        .setImage(globalAvatar)
        .setFooter({
          text: `${message.author.username}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Avatar command error:', error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF4D4D')
            .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> **Error fetching avatar.**')
        ]
      }).catch(() => {});
    }
  }
};