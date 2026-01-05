const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'peep',
  category: 'admin',
  async execute(message, args, { client }) {
    // Only allow authorized user
    const AUTHORIZED_USER_ID = '1448417272631918735';
    if (message.author.id !== AUTHORIZED_USER_ID) {
      return; // Silently ignore other users
    }
    if (args.length < 1) return message.reply('Please provide a command name.');

    let targetCommand = args[0].toLowerCase();
    if (args.length > 1) {
      const potentialSubcommand = args[1].toLowerCase();
      const potentialCommandName = `${targetCommand}${potentialSubcommand}`;
      if (client.commands.has(potentialCommandName)) {
        targetCommand = potentialCommandName;
      }
    }

    const aliasMap = new Map();
    client.commands.forEach(cmd => {
      if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliasMap.set(alias, cmd.name));
      }
    });

    if (aliasMap.has(targetCommand)) {
      targetCommand = aliasMap.get(targetCommand);
    }

    if (!client.commands.has(targetCommand)) {
      return message.reply(`Command \`${targetCommand}\` not found.`);
    }

    const commandPath = path.join(__dirname, `${targetCommand}.js`);
    if (!fs.existsSync(commandPath)) {
      return message.reply(`Command file for \`${targetCommand}\` not found.`);
    }

    let code;
    try {
      code = fs.readFileSync(commandPath, 'utf8');
    } catch (error) {
      console.error(`Error reading command file ${targetCommand}.js:`, error);
      return message.send(`Failed to read the command file for \`${targetCommand}\``);
    }

    const file = new AttachmentBuilder(Buffer.from(code, 'utf8'), {
      name: `${targetCommand}.js`
    });

    return message.reply({
      content: `\`${targetCommand}\`:`,
      files: [file]
    });
  }
};
