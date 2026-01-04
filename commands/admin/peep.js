const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'peep',
  category: 'admin',
  async execute(message, args, { client }) {
    // Only allow in specific server
    if (message.guild?.id !== '1455305225081589843') return;
    
    if (!message.content.toLowerCase().startsWith(';peep')) return;

    if (message.author.id !== '758522527885951016') return message.react('😂');
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
