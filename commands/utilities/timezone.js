const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');
const { dbHelpers } = require('../../db');

// us state → tz table: longer than the command logic 😭

const stateToTimezone = {
    "alabama": "America/Chicago",
    "alaska": "America/Anchorage",
    "arizona": "America/Phoenix",
    "arkansas": "America/Chicago",
    "california": "America/Los_Angeles",
    "colorado": "America/Denver",
    "connecticut": "America/New_York",
    "delaware": "America/New_York",
    "florida": "America/New_York",
    "georgia": "America/New_York",
    "hawaii": "Pacific/Honolulu",
    "idaho": "America/Boise",
    "illinois": "America/Chicago",
    "indiana": "America/Indiana/Indianapolis",
    "iowa": "America/Chicago",
    "kansas": "America/Chicago",
    "kentucky": "America/New_York",
    "louisiana": "America/Chicago",
    "maine": "America/New_York",
    "maryland": "America/New_York",
    "massachusetts": "America/New_York",
    "michigan": "America/Detroit",
    "minnesota": "America/Chicago",
    "mississippi": "America/Chicago",
    "missouri": "America/Chicago",
    "montana": "America/Denver",
    "nebraska": "America/Chicago",
    "nevada": "America/Los_Angeles",
    "new hampshire": "America/New_York",
    "new jersey": "America/New_York",
    "new mexico": "America/Denver",
    "new york": "America/New_York",
    "north carolina": "America/New_York",
    "north dakota": "America/North_Dakota/Center",
    "ohio": "America/New_York",
    "oklahoma": "America/Chicago",
    "oregon": "America/Los_Angeles",
    "pennsylvania": "America/New_York",
    "rhode island": "America/New_York",
    "south carolina": "America/New_York",
    "south dakota": "America/Chicago",
    "tennessee": "America/Chicago",
    "texas": "America/Chicago",
    "utah": "America/Denver",
    "vermont": "America/New_York",
    "virginia": "America/New_York",
    "washington": "America/Los_Angeles",
    "west virginia": "America/New_York",
    "wisconsin": "America/Chicago",
    "wyoming": "America/Denver"
};

module.exports = {
    name: 'timezone',
    aliases: ['tz'],
    category: ['miscellaneous'],
    description: ['<:arrows:1457808531678957784> Set a timezone for yourself.'],
    async execute(message, args, { prefix }) {
        if (args[0] === 'set') {
            const timezoneInput = args.slice(1).join(' ').toLowerCase();

            if (!timezoneInput) {
                const embed = new EmbedBuilder()
                    .setColor('#838996')
                    .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Specify a **timezone** (e.g. \`${prefix}tz set california\`)`);
                return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
            }

            const validTimezones = moment.tz.names();

            let foundTimezone = validTimezones.find(tz =>
                tz.toLowerCase().includes(timezoneInput)
            );

            if (!foundTimezone && stateToTimezone[timezoneInput]) {
                foundTimezone = stateToTimezone[timezoneInput];
            }

            if (!foundTimezone) {
                const embed = new EmbedBuilder()
                    .setColor('#838996')
                    .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Invalid **timezone** or **state**. Use format like: `America/New_York` or `Texas`');
                return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
            }

            dbHelpers.setUserTimezone(message.author.id, foundTimezone);

            const embed = new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:timezone:1363628573159592106> <:arrows:1457808531678957784> Your **timezone** has been set to **${foundTimezone}**`);
            return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }

        const userTimezone = dbHelpers.getUserTimezone(message.author.id);

        if (!userTimezone) {
            const embed = new EmbedBuilder()
                .setColor('#838996')
                .setDescription(`<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You haven't set your **timezone** yet. Use \`${prefix}tz set <city/state>\``);
            return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }

        const currentTime = moment().tz(userTimezone).format('MMMM D, hh:mm A');

        const embed = new EmbedBuilder()
            .setColor('#838996')
            .setDescription(`<:timezone:1363628573159592106> <:arrows:1457808531678957784> Your current time is **${currentTime}**`);
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
};
