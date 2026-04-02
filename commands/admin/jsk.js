/*
 * jsk (aliases: js, javascript) — Bot owner only (BOT_OWNER_ID).
 *
 * Inspects bot source: finds `<name>.js` under `commands/` or the project root, shows a confirmation embed,
 * then serves the file (with restrictions on critical paths like index). Compound command names supported
 * (e.g. two args if a single registered command matches).
 *
 * Usage:
 *   <prefix>jsk <fileOrCommandName> [secondWord]
 */

// recursive file hunt + confirm button because one accidental paste almost leaked everything 😭

const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  name: 'jsk',
  aliases: ['js', 'javascript'],
  category: 'admin',
  async execute(message, args, { client }) {
    if (!config.botOwnerId || message.author.id !== config.botOwnerId) {
      return;
    }

    if (!args.length) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> Please provide a **command name**.');
      return message.reply({ embeds: [embed] });
    }

    let targetCommand = args[0].toLowerCase();

    // Check for subcommand format (e.g., "filter add")
    if (args.length > 1) {
      const potentialSubcommand = args[1].toLowerCase();
      const potentialCommandName = `${targetCommand}${potentialSubcommand}`;
      if (client.commands.has(potentialCommandName)) {
        targetCommand = potentialCommandName;
      }
    }

    // Resolve aliases
    const aliasMap = new Map();
    client.commands.forEach(cmd => {
      if (cmd.aliases && Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach(alias => aliasMap.set(alias, cmd.name));
      }
    });

    if (aliasMap.has(targetCommand)) {
      targetCommand = aliasMap.get(targetCommand);
    }

    // Search for file in all directories (commands, root, etc.)
    function findFile(fileName, searchDir) {
      if (!fs.existsSync(searchDir)) return null;
      
      const items = fs.readdirSync(searchDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(searchDir, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and other unnecessary directories
          if (item.name === 'node_modules' || item.name === '.git') continue;
          // Recursively search subdirectories
          const found = findFile(fileName, fullPath);
          if (found) return found;
        } else if (item.isFile() && item.name === fileName || item.name === `${fileName}.js`) {
          return fullPath;
        }
      }
      
      return null;
    }
    
    // First, try to find as a command file
    let filePath = null;
    if (client.commands.has(targetCommand)) {
      const commandsDir = path.join(__dirname, '../..', 'commands');
      filePath = findFile(`${targetCommand}.js`, commandsDir);
    }
    
    // If not found as command, search entire project directory
    if (!filePath) {
      const projectRoot = path.join(__dirname, '../..');
      filePath = findFile(`${targetCommand}.js`, projectRoot);
      
      // Also try without .js extension for files like storedata.json, config.json, etc.
      if (!filePath) {
        filePath = findFile(targetCommand, projectRoot);
      }
    }
    
    if (!filePath) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> File \`${targetCommand}\` **not found**.`);
      return message.reply({ embeds: [embed] });
    }
    
    // Block critical files
    const criticalFiles = ['index.js', 'config.json'];
    const fileName = path.basename(filePath);
    const fileNameLower = fileName.toLowerCase();
    
    // Check if it's a critical file
    if (criticalFiles.includes(fileNameLower) || targetCommand.toLowerCase() === 'index') {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setDescription([
          `<:alert:1363009864112144394> <:arrows:1363099226375979058> **Access Denied**`,
          '',
          `-# The file \`${fileName}\` is a **critical system file** and cannot be viewed.`,
          `-# This file contains sensitive bot tokens, API keys, and core bot logic that must remain protected.`,
          '',
          `-# Viewing this file could expose security vulnerabilities and compromise the bot's integrity.`
        ].join('\n'));
      return message.reply({ embeds: [embed] });
    }

    // Show confirmation warning
    const warningEmbed = new EmbedBuilder()
      .setColor('#838996')
      .setDescription([
        `<:alert:1363009864112144394> <:arrows:1363099226375979058> You're about to view the source code for **${fileName}**`,
        '',
        `-# Path: \`${path.relative(path.join(__dirname, '../..'), filePath)}\``,
        '-# This action requires confirmation.'
      ].join('\n'));

    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_jsk')
          .setLabel('View Code')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_jsk')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

    const confirmation = await message.reply({
      embeds: [warningEmbed],
      components: [confirmRow]
    }).catch(() => {});

    if (!confirmation) return;

    const filter = i => i.user.id === message.author.id;
    const collector = confirmation.createMessageComponentCollector({
      filter,
      time: 30000
    });

    collector.on('collect', async i => {
      if (i.customId === 'cancel_jsk') {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:excl:1362858572677120252> <:arrows:1363099226375979058> View **cancelled**')
          ],
          components: []
        }).catch(() => {});
        return;
      }

      // Read and send the file
      try {
        const code = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        
        const file = new AttachmentBuilder(Buffer.from(code, 'utf8'), {
          name: fileName
        });

        await i.update({
          embeds: [],
          files: [file],
          components: []
        }).catch(() => {});
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription(`<:excl:1362858572677120252> <:arrows:1363099226375979058> Failed to read **${path.basename(filePath)}**`)
          ],
          components: []
        }).catch(() => {});
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        confirmation.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#838996')
              .setDescription('<:alert:1363009864112144394> <:arrows:1363099226375979058> Confirmation **timed out**')
          ],
          components: []
        }).catch(() => {});
      }
    });
  }
};
