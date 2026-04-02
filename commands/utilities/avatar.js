const { EmbedBuilder } = require('discord.js');
const { description, category } = require('./clearsnipe');

// re-exporting clearsnipe meta is cursed inheritance; it works don't ask 😭

module.exports = {
  name: 'avatar',
  aliases: ['av', 'sav'],
  description: '<:arrows:1457808531678957784> View a user avatar',
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


      const member = await message.guild.members.fetch(target.id).catch(() => null);
      
      if (isServerAvatar) {
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
              .setDescription("<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This user doesn't have a server-specific avatar.")
          ],
          allowedMentions: { repliedUser: false }
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

        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
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

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Avatar command error:', error);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF4D4D')
            .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Error fetching avatar.**')
        ],
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
  }
};