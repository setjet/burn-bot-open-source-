const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { dbHelpers } = require('../../db');
const OWNER_ID = "758522527885951016";

module.exports = {
  name: 'birthday',
  aliases: ['bday'],
  category: ['miscellaneous'],
  description: ['<:arrows:1457808531678957784> Set a birthday for yourself.'],
  async execute(message, args, { getUser, prefix }) {
    // --- SET BIRTHDAY ---
    if (args[0] === 'set') {
      let target = message.author;
      let dateStartIndex = 1;

      const mention = message.mentions.users.first();
      if (mention) {
        if (message.author.id !== OWNER_ID) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#FF0000').setDescription("<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You don't have **permission** to set birthdays for others.")],
        allowedMentions: { repliedUser: false }
      });
        }
        target = mention;
        dateStartIndex = 2;
      }

      const date = args.slice(dateStartIndex).join(' ');

      const isMonthDay = /^[a-zA-Z]+\s+\d{1,2}(,\s*\d{4})?$/.test(date);
      const isNumeric = /^\d{1,2}\/\d{1,2}(\/\d{4})?$/.test(date);

      if (!date || (!isMonthDay && !isNumeric)) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#838996').setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> **Specify a date** (e.g. \`${prefix}bday set 12/4/2002\`)`)],
        allowedMentions: { repliedUser: false }
      });
      }

      let formattedDate;
      if (isNumeric) {
        const parts = date.split('/');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2] || '2000';
        const momentDate = moment(`${day}-${month}-${year}`, 'DD-MM-YYYY');
        formattedDate = momentDate.isValid() ? momentDate.format('DD MMMM, YYYY') : date;
      } else {
        const momentDate = moment(date, ['MMMM D, YYYY', 'MMMM D']);
        formattedDate = momentDate.isValid() ? momentDate.format('DD MMMM, YYYY') : date;
      }

      const birthdayDate = moment(formattedDate, 'DD MMMM, YYYY').format('YYYY-MM-DD');
      dbHelpers.setBirthday(target.id, birthdayDate);

      return message.reply({
        embeds: [new EmbedBuilder().setColor('#838996').setDescription(`<:check:1457808518848581858> <:arrows:1457808531678957784> ${target.id === message.author.id ? "Your" : `${target.username}'s`} **Birthday** has been set to **${formattedDate}**`)],
        allowedMentions: { repliedUser: false }
      });
    }

    // --- VIEW BIRTHDAY ---
    let target = message.author;
    if (args[0]) {
      const input = args.join(' ');
      const foundUser = await getUser(message, input);
      if (foundUser) {
        target = foundUser;
      }
    }

    const rawBirthday = dbHelpers.getBirthday(target.id);
    if (!rawBirthday) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#838996').setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> ${target.id === message.author.id ? "You haven't" : "This user hasn't"} set ${target.id === message.author.id ? "your" : "their"} **birthday** yet. Use \`${prefix}bday set <date>\``)],
        allowedMentions: { repliedUser: false }
      });
    }

    const prettyDate = moment(rawBirthday, 'YYYY-MM-DD').format('DD MMMM, YYYY');

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription(`<:c4ke:1363829350692290651> <:arrows:1457808531678957784> ${target.id === message.author.id ? "Your" : `${target.username}'s`} **birthday** is on **${prettyDate}**`);

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  }
};
