const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { dbHelpers } = require('../../db');
const { canControlChannel, resolveDefaultName, ensurePanelMessage } = require('./utils');

// unfinished masterpiece energy — README warned you 😭

// Load subcommand modules: filename without .js = subcommand key
const commandModules = {};
const commandsDir = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const key = file.replace(/\.js$/, '');
  commandModules[key] = require(path.join(commandsDir, file));
}

module.exports = {
  name: 'voicemaster',
  category: 'voicemaster',
  description: ['<:arrows:1457808531678957784> Create and control temporary voice channels.'],
  async execute(message, args, { prefix, client, getUser, dbHelpers: db }) {
    const sub = args[0]?.toLowerCase();
    const guild = message.guild;
    if (!guild) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> This command is only available in a **server**.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    // Setup runs without config
    if (sub === 'setup') {
      return commandModules.setup.execute(message, args, { prefix, client, db });
    }

    const config = db.getVoiceMasterConfig(guild.id);
    if (!config) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> VoiceMaster is not set up. An admin can run `' + prefix + 'voicemaster setup`.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const member = message.member;
    const voiceChannel = member?.voice?.channel;
    const channelData = voiceChannel ? db.getVoiceMasterChannel(voiceChannel.id) : null;
    const isOwnerOrStaff = channelData && canControlChannel(member, channelData);

    const context = {
      prefix,
      client,
      getUser,
      db,
      config,
      guild,
      member,
      voiceChannel,
      channelData,
      isOwnerOrStaff
    };

    // "join role" -> joinrole subcommand
    if (sub === 'join' && args[1]?.toLowerCase() === 'role') {
      return commandModules.joinrole.execute(message, args, context);
    }

    // Admin-only subcommands (no need to be in a VM channel)
    if (sub === 'category') return commandModules.category.execute(message, args, context);
    if (sub === 'default') return commandModules.default.execute(message, args, context);

    // Music can be run by channel owner only
    if (sub === 'music') return commandModules.music.execute(message, args, context);

    // Owner-only: must be in the VM channel you own
    const ownerOnlySubs = ['rename', 'limit', 'lock', 'unlock', 'ghost', 'unghost', 'permit', 'claim', 'transfer'];
    if (ownerOnlySubs.includes(sub)) {
      if (!voiceChannel || !channelData) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Join a VoiceMaster **temporary channel** first, then use these commands.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      if (!isOwnerOrStaff) {
        const embed = new EmbedBuilder()
          .setColor('#838996')
          .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Only the **channel owner** (the user who created it) can do that.');
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const handler = commandModules[sub];
      if (handler) return handler.execute(message, args, context);
    }

    // No subcommand or unknown -> show help
    return commandModules.help.execute(message, args, context);
  },

  setup(client) {
    const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
    const { dbHelpers } = require('../../db');

    client.on('voiceStateUpdate', async (oldState, newState) => {
      const guildId = newState.guild.id;
      const config = dbHelpers.getVoiceMasterConfig(guildId);
      if (!config) return;

      const joinChannelId = config.joinChannelId;
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      if (newChannelId === joinChannelId && oldChannelId !== joinChannelId) {
        const member = newState.member;
        if (!member || member.user.bot) return;
        const guild = newState.guild;
        const joinChannel = newState.channel;
        if (!joinChannel) return;

        const categoryId = config.categoryId || null;
        const name = resolveDefaultName(config.defaultName, member);
        const bitrate = Math.min(384000, Math.max(8000, config.defaultBitrate || 64000));
        const rtcRegion = config.defaultRegion || null;

        try {
          const newChannel = await guild.channels.create({
            name: name.substring(0, 100),
            type: ChannelType.GuildVoice,
            parent: categoryId,
            bitrate,
            rtcRegion: rtcRegion || undefined,
            permissionOverwrites: [
              { id: guild.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel], type: 0 },
              { id: client.user.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect], type: 1 }
            ]
          });
          dbHelpers.setVoiceMasterChannel(newChannel.id, {
            channelId: newChannel.id,
            guildId: guild.id,
            ownerId: member.id,
            locked: false,
            hidden: false,
            userLimit: 0,
            musicMode: config.musicMode || false,
            permittedIds: []
          });
          await member.voice.setChannel(newChannel).catch(() => {});
          if (config.musicMode) {
            await newChannel.permissionOverwrites.edit(guild.roles.everyone, { Speak: false, Stream: false }).catch(() => {});
            await newChannel.permissionOverwrites.edit(client.user.id, { Speak: true, Stream: true }).catch(() => {});
          }
        } catch (err) {
          console.error('VoiceMaster create channel error:', err);
        }
        return;
      }

      if (config.joinRoleId && oldChannelId) {
        const oldData = dbHelpers.getVoiceMasterChannel(oldChannelId);
        if (oldData && oldChannelId !== joinChannelId) {
          try {
            await oldState.member?.roles?.remove(config.joinRoleId).catch(() => {});
          } catch (e) {}
        }
      }
      if (config.joinRoleId && newChannelId) {
        const newData = dbHelpers.getVoiceMasterChannel(newChannelId);
        if (newData && newChannelId !== joinChannelId) {
          try {
            await newState.member?.roles?.add(config.joinRoleId).catch(() => {});
          } catch (e) {}
        }
      }

      if (oldChannelId && oldChannelId !== joinChannelId) {
        const data = dbHelpers.getVoiceMasterChannel(oldChannelId);
        if (data) {
          const channel = oldState.guild.channels.cache.get(oldChannelId);
          if (channel && channel.members.size === 0) {
            dbHelpers.deleteVoiceMasterChannel(oldChannelId);
            await channel.delete().catch(() => {});
          }
        }
      }
    });

    client.on('channelDelete', (channel) => {
      if (channel.type !== ChannelType.GuildVoice) return;
      dbHelpers.deleteVoiceMasterChannel(channel.id);
    });

    client.on('interactionCreate', async (interaction) => {
      const { ComponentType, StringSelectMenuBuilder } = require('discord.js');

      const isButton = interaction.isButton() && interaction.customId?.startsWith('voicemaster-');
      const isSelect = interaction.isStringSelectMenu() && interaction.customId === 'voicemaster-disconnect-select';
      if (!isButton && !isSelect) return;

      const guild = interaction.guild;
      const member = interaction.member;
      if (!guild || !member) return;

      const config = dbHelpers.getVoiceMasterConfig(guild.id);
      if (!config) {
        return interaction.reply({ content: 'VoiceMaster is not set up.', ephemeral: true }).catch(() => {});
      }

      // Disconnect: select menu response — disconnect selected member from voice
      if (isSelect) {
        const voiceChannel = member.voice?.channel;
        const channelData = voiceChannel ? dbHelpers.getVoiceMasterChannel(voiceChannel.id) : null;
        if (!channelData || !canControlChannel(member, channelData)) {
          return interaction.reply({ content: 'You can only disconnect members from your own VoiceMaster channel.', ephemeral: true }).catch(() => {});
        }
        const targetId = interaction.values[0];
        const targetMember = await guild.members.fetch(targetId).catch(() => null);
        if (!targetMember?.voice?.channelId || targetMember.voice.channelId !== voiceChannel.id) {
          return interaction.update({ content: 'That member is no longer in the channel.', components: [] }).catch(() => interaction.reply({ content: 'That member is no longer in the channel.', ephemeral: true }));
        }
        await targetMember.voice.disconnect().catch(() => {});
        return interaction.update({ content: `Disconnected ${targetMember}.`, components: [] }).catch(() => interaction.reply({ content: `Disconnected ${targetMember}.`, ephemeral: true }));
      }

      const voiceChannel = member.voice?.channel;
      const channelData = voiceChannel ? dbHelpers.getVoiceMasterChannel(voiceChannel.id) : null;
      const allowed = channelData && canControlChannel(member, channelData);
      const id = interaction.customId;

      const deny = (msg) => interaction.reply({ content: msg || 'Join the VoiceMaster channel you own to use this.', ephemeral: true }).catch(() => {});

      if (id === 'voicemaster-info') {
        const embed = new EmbedBuilder()
          .setColor(0x00BFFF)
          .setTitle('VoiceMaster — Channel Info')
          .setDescription([
            'Join the **Join to Create** voice channel to get your own temporary channel.',
            '',
            '**In your channel:** `voicemaster rename/limit/lock/unlock/ghost/unghost/permit/claim/transfer/music`',
            '**Admin:** `voicemaster setup`, `default name/bitrate/region`, `category`, `join role`'
          ].join('\n'));
        return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      }

      if (id === 'voicemaster-activity') {
        return interaction.reply({
          content: 'To start an activity (e.g. watch together), use the **voice channel menu** in Discord: click the channel name and choose "Start Activity".',
          ephemeral: true
        }).catch(() => {});
      }

      if (['voicemaster-lock', 'voicemaster-unlock', 'voicemaster-ghost', 'voicemaster-reveal', 'voicemaster-claim', 'voicemaster-limit-up', 'voicemaster-limit-down'].includes(id) && !allowed) {
        return deny();
      }

      const everyone = guild.roles.everyone;

      if (id === 'voicemaster-lock') {
        await voiceChannel.permissionOverwrites.edit(everyone, { Connect: false }).catch(() => {});
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, locked: true });
        return interaction.reply({ content: 'Channel **locked**.', ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-unlock') {
        await voiceChannel.permissionOverwrites.edit(everyone, { Connect: null }).catch(() => {});
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, locked: false });
        return interaction.reply({ content: 'Channel **unlocked**.', ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-ghost') {
        await voiceChannel.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => {});
        const permit = [...new Set([...(channelData.permittedIds || []), channelData.ownerId])];
        for (const pid of permit) {
          const permType = guild.roles.cache.has(pid) ? 0 : 1;
          await voiceChannel.permissionOverwrites.edit(pid, { ViewChannel: true, Connect: true, type: permType }).catch(() => {});
        }
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, hidden: true });
        return interaction.reply({ content: 'Channel is now **hidden**.', ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-reveal') {
        await voiceChannel.permissionOverwrites.edit(everyone, { ViewChannel: null }).catch(() => {});
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, hidden: false });
        return interaction.reply({ content: 'Channel is now **visible**.', ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-claim') {
        const currentOwnerInChannel = voiceChannel.members.has(channelData.ownerId);
        if (currentOwnerInChannel) {
          return interaction.reply({ content: 'The current owner is still in the channel.', ephemeral: true }).catch(() => {});
        }
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, ownerId: member.id });
        return interaction.reply({ content: 'You are now the **owner** of this channel.', ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-limit-up') {
        const next = Math.min(99, (channelData.userLimit || 0) + 1);
        await voiceChannel.setUserLimit(next).catch(() => {});
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, userLimit: next });
        return interaction.reply({ content: `User limit set to **${next}**.`, ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-limit-down') {
        const next = Math.max(0, (channelData.userLimit || 0) - 1);
        await voiceChannel.setUserLimit(next).catch(() => {});
        dbHelpers.setVoiceMasterChannel(voiceChannel.id, { ...channelData, userLimit: next });
        return interaction.reply({ content: `User limit set to **${next === 0 ? 'none' : next}**.`, ephemeral: true }).catch(() => {});
      }
      if (id === 'voicemaster-disconnect') {
        if (!allowed) return deny();
        const membersInChannel = voiceChannel.members.filter(m => !m.user.bot && m.id !== member.id);
        if (membersInChannel.size === 0) {
          return interaction.reply({ content: 'No other members in the channel to disconnect.', ephemeral: true }).catch(() => {});
        }
        const options = Array.from(membersInChannel.values()).slice(0, 25).map(m => ({
          label: (m.displayName || m.user.username).slice(0, 100),
          value: m.id,
          description: (m.user.tag || m.id).slice(0, 100)
        }));
        const menu = new StringSelectMenuBuilder()
          .setCustomId('voicemaster-disconnect-select')
          .setPlaceholder('Select a member to disconnect')
          .addOptions(options);
        const { ActionRowBuilder } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.reply({ content: 'Select a member to disconnect from the voice channel:', components: [row], ephemeral: true }).catch(() => {});
      }
    });

    (async () => {
      await new Promise(r => setImmediate(r));
      for (const [guildId, guild] of client.guilds.cache) {
        const channelIds = dbHelpers.getVoiceMasterChannelsByGuild(guildId);
        for (const cid of channelIds) {
          const ch = guild.channels.cache.get(cid);
          if (!ch) {
            dbHelpers.deleteVoiceMasterChannel(cid);
          } else if (ch.members.size === 0) {
            dbHelpers.deleteVoiceMasterChannel(cid);
            await ch.delete().catch(() => {});
          }
        }
      }
    })();
  }
};
