const { EmbedBuilder } = require('discord.js');

const RESPONSES = [
  'Yes.', 'No.', 'Maybe.', 'Definitely.', 'Absolutely not.', 'Without a doubt.',
  'Signs point to yes.', 'Signs point to no.', 'Reply hazy, try again.',
  'Ask again later.', 'Better not tell you now.', 'Cannot predict now.',
  'Don\'t count on it.', 'My sources say no.', 'Outlook good.',
  'Outlook not so good.', 'Very doubtful.', 'It is certain.', 'Most likely.',
  'Yep.', 'Nope.', 'Sure.', 'Nah.', 'I guess so.', 'Probably not.'
];

module.exports = {
  name: '8ball',
  aliases: ['eightball', 'ball'],
  category: 'fun',
  description: 'Ask the magic 8ball a yes/no question.',
  async execute(message, args, { prefix }) {
    const question = args.join(' ').trim();
    if (!question) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#838996')
            .setDescription([
              '<:settings:1457808572720087266> **Usage:**',
              `\`\`\`${prefix}8ball <question>\`\`\``,
              '-# <:arrows:1457808531678957784> Ask the magic 8ball a yes/no question.',
              '',
              `**Example:** \`${prefix}8ball will I get rich?\``,
              '\n**Aliases:** `eightball`, `ball`'
            ].join('\n'))
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setTitle('<:arrows:1457808531678957784> Magic 8ball')
      .setDescription([
        '<:leese:1457834970486800567> **Question:** ' + question,
        '<:tree:1457808523986731008> **Answer:** ' + answer,
      ].join('\n'))
      .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
