const { EmbedBuilder } = require('discord.js');
const { dbHelpers } = require('../../db');
const OWNER_ID = "1448417272631918735";

// Helper functions for slur counts
function getSlurCount(userId, type) {
  const counts = dbHelpers.getSlurCounts(userId);
  return counts[`${type}_count`] || 0;
}

function setSlurCount(userId, type, count) {
  let counts = dbHelpers.getSlurCounts(userId) || {};
  // Ensure counts is an object (not array, not null)
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    counts = {};
  }
  counts[`${type}_count`] = count;
  dbHelpers.setSlurCounts(userId, counts);
}

function getAllSlurCounts() {
  const allCounts = dbHelpers.getAllSlurCounts();
  const result = new Map();
  for (const [userId, counts] of Object.entries(allCounts)) {
    for (const [key, value] of Object.entries(counts)) {
      result.set(key, value);
    }
  }
  return result;
} 

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
                    return message.channel.send("Couldn't find that user.");
                }
            }

            const input = args.slice(2).join(' ');
            const niggaMatch = input.match(/nigga:\s*(\d+)/i);
            const niggerMatch = input.match(/nigger:\s*(\d+)/i);

            if (!niggaMatch || !niggerMatch) {
                return message.channel.send('Invalid format.`');
            }

            const niggaCount = parseInt(niggaMatch[1]);
            const niggerCount = parseInt(niggerMatch[1]);

            if (isNaN(niggaCount) || isNaN(niggerCount)) {
                return message.channel.send('Invalid numbers');
            }

            setSlurCount(targetUser.id, 'nigga', niggaCount);
            setSlurCount(targetUser.id, 'nigger', niggerCount);

            return message.channel.send(`Updated ${targetUser.username}'s counts: nigga=${niggaCount}, nigger=${niggerCount}`);
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
                    return message.channel.send("Mention a user to reset their stats.");
                }
            }

            setSlurCount(targetUser.id, 'nigga', 0);
            setSlurCount(targetUser.id, 'nigger', 0);

            return message.channel.send(`👍`);
        }

        const targetUser = message.mentions.users.first() || message.author;
        const userId = targetUser.id;
        const countNigga = getSlurCount(userId, 'nigga');
        const countNigger = getSlurCount(userId, 'nigger');
        const totalCount = countNigga + countNigger;

        const embed = new EmbedBuilder()
            .setColor('#838996') 
            .setTitle('how racist are you?')
            .setDescription(`<@${targetUser.id}> has said the nword **${totalCount}** times\n**${countNigger}** of those were the **Hard R**\n-# im arab, that means i can say the nword right?`)
            .setFooter({ 
                text: `${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            });

        await message.channel.send({ embeds: [embed] });
    },

    messageListener: async (message) => {
        if (message.author.bot) return;

        const content = message.content.toLowerCase();
        const userId = message.author.id;

        const niggaCount = (content.match(/nigga/g) || []).length;
        const niggerCount = (content.match(/nigger/g) || []).length;

        if (niggaCount > 0) {
            const current = getSlurCount(userId, 'nigga') || 0;
            setSlurCount(userId, 'nigga', current + niggaCount);
        }

        if (niggerCount > 0) {
            const current = getSlurCount(userId, 'nigger') || 0;
            setSlurCount(userId, 'nigger', current + niggerCount);
        }
    }
};
