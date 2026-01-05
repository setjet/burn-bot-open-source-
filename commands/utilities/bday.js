const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { dbHelpers } = require('../../db');
const OWNER_ID = "758522527885951016";

module.exports = {
  name: 'birthday',
  aliases: ['bday'],
  category: ['miscellaneous'],
  description: ['<:arrows:1363099226375979058> Set a birthday for yourself.'],
  async execute(message, args, { getUser, prefix }) {
    // --- SET BIRTHDAY ---
    if (args[0] === 'set') {
      let target = message.author;
      let dateStartIndex = 1;

      const mention = message.mentions.users.first();
      if (mention) {
        if (message.author.id !== OWNER_ID) {
          return message.reply({
            embeds: [new EmbedBuilder().setColor('#FF0000').setDescription("<:excl:1362858572677120252> <:arrows:1363099226375979058> You don't have **permission** to set birthdays for others.")]
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
          embeds: [new EmbedBuilder().setColor('#838996').setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> **Specify a date** (e.g. \`${prefix}bday set 12/4/2002\`)`)]
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
        embeds: [new EmbedBuilder().setColor('#838996').setDescription(`<:check:1362850043333316659> <:arrows:1363099226375979058> Your **Birthday** has been set to **${formattedDate}**`)]
      });
    }

    // --- VIEW BIRTHDAY ---
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      const input = args.join(' ');
      const byIdOrUsername = await getUser(message, input);
      const byDisplayName = message.guild.members.cache.find(m =>
        m.displayName.toLowerCase() === input.toLowerCase()
      );
      target = byIdOrUsername || (byDisplayName ? byDisplayName.user : null);
    }
    if (!target) target = message.author;

    const rawBirthday = dbHelpers.getBirthday(target.id);
    if (!rawBirthday) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor('#838996').setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> You haven't set your **birthday** yet. Use \`${prefix}bday set <date>\``)]
      });
    }

    const prettyDate = moment(rawBirthday, 'YYYY-MM-DD').format('DD MMMM, YYYY');

    const embed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription(`<:c4ke:1363829350692290651> <:arrows:1363099226375979058> Your **birthday** is on **${prettyDate}**`);

    await message.reply({ embeds: [embed] });
  }
};
