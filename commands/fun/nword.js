const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../storedata.json');
const OWNER_ID = "758522527885951016";

// Load slur counts from storedata.json
function loadSlurCounts() {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return new Map(Object.entries(data.slurCounts || {}));
    }
  } catch (err) {
    console.error('Error loading slur counts:', err);
  }
  return new Map();
}

// Save slur counts to storedata.json  
function saveSlurCounts(counts) {
  try {
    let data = {};
    if (fs.existsSync(storePath)) {
      data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
    data.slurCounts = Object.fromEntries(counts);
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving slur counts:', err);
  }
}

const slurCounts = loadSlurCounts(); 

module.exports = {
    name: 'nword',
    aliases: ['nw'],
    async execute(message, args, { client }) {
        if (args[0] === 'set') {
            if (message.author.id !== OWNER_ID) {
                return message.react('❌');
            }

            const targetArg = args[1];
            let targetUser = message.mentions.users.first();

            if (!targetUser) {
                try {
                    targetUser = await client.users.fetch(targetArg);
                } catch {
                    return message.reply("Couldn't find that user.");
                }
            }

            const input = args.slice(2).join(' ');
            const niggaMatch = input.match(/nigga:\s*(\d+)/i);
            const niggerMatch = input.match(/nigger:\s*(\d+)/i);

            if (!niggaMatch || !niggerMatch) {
                return message.reply('Invalid format.`');
            }

            const niggaCount = parseInt(niggaMatch[1]);
            const niggerCount = parseInt(niggerMatch[1]);

            if (isNaN(niggaCount) || isNaN(niggerCount)) {
                return message.reply('Invalid numbers');
            }

            slurCounts.set(`${targetUser.id}_nigga`, niggaCount);
            slurCounts.set(`${targetUser.id}_nigger`, niggerCount);
            saveSlurCounts(slurCounts);

            return message.reply(`Updated ${targetUser.username}'s counts: nigga=${niggaCount}, nigger=${niggerCount}`);
        }

 
        if (args[0] === 'reset') {
            if (message.author.id !== OWNER_ID) {
                return message.react('❌');
            }

            const targetArg = args[1];
            let targetUser = message.mentions.users.first();

            if (!targetUser) {
                try {
                    targetUser = await client.users.fetch(targetArg);
                } catch {
                    return message.reply("Mention a user to reset their stats.");
                }
            }

            slurCounts.set(`${targetUser.id}_nigga`, 0);
            slurCounts.set(`${targetUser.id}_nigger`, 0);
            saveSlurCounts(slurCounts);

            return message.reply(`👍`);
        }

        const targetUser = message.mentions.users.first() || message.author;
        const userId = targetUser.id;
        const countNigga = slurCounts.get(`${userId}_nigga`) || 0;
        const countNigger = slurCounts.get(`${userId}_nigger`) || 0;
        const totalCount = countNigga + countNigger;

        const embed = new EmbedBuilder()
            .setColor('#838996') 
            .setTitle('how racist are you?')
            .setDescription(`<@${targetUser.id}> has said the nword **${totalCount}** times\n**${countNigger}** of those were the **Hard R**\n-# im arab, that means i can say the nword right?`)
            .setFooter({ 
                text: `${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            });

        await message.reply({ embeds: [embed] });
    },

    messageListener: async (message) => {
        if (message.author.bot) return;

        const content = message.content.toLowerCase();
        const userId = message.author.id;

        const niggaCount = (content.match(/nigga/g) || []).length;
        const niggerCount = (content.match(/nigger/g) || []).length;

        let updated = false;
        if (niggaCount > 0) {
            const current = slurCounts.get(`${userId}_nigga`) || 0;
            slurCounts.set(`${userId}_nigga`, current + niggaCount);
            updated = true;
        }

        if (niggerCount > 0) {
            const current = slurCounts.get(`${userId}_nigger`) || 0;
            slurCounts.set(`${userId}_nigger`, current + niggerCount);
            updated = true;
        }

        if (updated) {
            saveSlurCounts(slurCounts);
        }
    }
};
