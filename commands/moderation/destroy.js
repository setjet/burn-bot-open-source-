const { EmbedBuilder } = require('discord.js');

let tempGif = null;
const defaultGif = 'https://cdn.discordapp.com/attachments/1163915308260659293/1326556707073298432/VID_20250106_145855_848.gif?ex=682355b5&is=68220435&hm=2b005e563fe11a471a84f62dd385ba05f118bc80708fbc49b8fc9881dacc980e&';

module.exports = {
  name: '999',
  aliases: ['exile','decompose'],
  async execute(message, args) {
    if (message.author.id !== '758522527885951016') return;

    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'setgif') {
      const url = args[1];
      if (!url || !url.startsWith('http')) return;

      tempGif = url;
      return;
    }

    const arg = args[0];
    const allMembers = await message.guild.members.fetch();

    const target =
      message.mentions.members.first() ||
      allMembers.get(arg) ||
      allMembers.find(
        m =>
          m.user.username.toLowerCase() === arg?.toLowerCase() ||
          m.displayName.toLowerCase() === arg?.toLowerCase()
      );

    if (!target) return;

    for (let i = 10; i >= 1; i--) {
      await message.channel.send(i.toString());
      await new Promise(res => setTimeout(res, 1000));
    }

    const gifToUse = tempGif || defaultGif;
    await message.channel.send({ content: gifToUse });

    try {
      await target.ban({ reason: `Banned by ${message.author.tag}` });
    } catch (err) {
      console.error(`Failed to ban ${target.user.tag}:`, err);
    }

    tempGif = null;
  }
};
