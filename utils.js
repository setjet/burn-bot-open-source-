const { EmbedBuilder } = require('discord.js');

async function getTargetUser(input, client, message) {
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        try {
            return await client.users.fetch(mentionMatch[1]);
        } catch {
            return null;
        }
    }
    if (/^\d+$/.test(input)) {
        try {
            return await client.users.fetch(input);
        } catch {
            return null;
        }
    }
    if (message.guild) {
        const member = message.guild.members.cache.find(
            (m) => m.user.username.toLowerCase() === input.toLowerCase()
        );
        if (member) return member.user;
    }
    return client.users.cache.find((u) => u.username.toLowerCase() === input.toLowerCase()) || null;
}

async function getTargetMember(input, client, message) {
    const user = await getTargetUser(input, client, message);
    if (!user || !message.guild) return null;
    try {
        return await message.guild.members.fetch(user.id);
    } catch {
        return null;
    }
}

function getTargetRole(input, message) {
    if (!message.guild) return null;
    const mentionMatch = input.match(/^<@&(\d+)>$/);
    if (mentionMatch) return message.guild.roles.cache.get(mentionMatch[1]);
    if (/^\d+$/.test(input)) return message.guild.roles.cache.get(input);
    return message.guild.roles.cache.find(role => role.name.toLowerCase() === input.toLowerCase());
}

async function handleAFK(message, afkUsers, client) {
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afkUsers.has(user.id)) {
                const afkData = afkUsers.get(user.id);
                const embed = new EmbedBuilder()
                    .setColor('#2a2d31')
                    .setTitle('🔔 AFK Notice')
                    .setDescription(`**${user.tag}** is currently AFK.\n**Message:** \`${afkData.message}\`\n**Since:** <t:${Math.floor(afkData.timestamp / 1000)}:R>`)
                    .setTimestamp();
                message.channel.send({ embeds: [embed] });
            }
        });
    }

    if (afkUsers.has(message.author.id)) {
        afkUsers.delete(message.author.id);
        const embed = new EmbedBuilder()
            .setColor('#2a2d31')
            .setDescription(`Welcome back, **${message.author.tag}**. Your AFK status has been removed.`)
            .setTimestamp();
        await message.reply({ embeds: [embed] });
    }
}

async function handleMessage(message, client, prefix, whitelistedIds, commandAliases, afkUsers, loadCommands) {
    if (!message.content.startsWith(prefix)) return;

    if (!whitelistedIds.includes(message.author.id)) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('🚫 **Error:** You must be whitelisted by <@758522527885951016> to use this command.')
            .setTimestamp();
        await message.reply({ embeds: [embed] });
        return;
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    let command = args.shift().toLowerCase();
    command = commandAliases[command] || command;

    if (command === 'reload') {
        await client.commands.reload(message, client, args, afkUsers, loadCommands);
        return;
    }

    if (client.commands[command]) {
        await client.commands[command](message, client, args, afkUsers);
    }
}

module.exports = {
    getTargetUser,
    getTargetMember,
    getTargetRole,
    handleAFK,
    handleMessage
};