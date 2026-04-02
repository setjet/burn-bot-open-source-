const { EmbedBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits } = require('discord.js');
const { ensurePanelMessage, DEFAULT_VOICE_NAME } = require('../utils');

// panel message persistence haunted my dreams 😭

module.exports = {
  name: 'setup',
  async execute(message, args, { prefix, client, db }) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> You need **Manage Channels** to run VoiceMaster setup.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const guild = message.guild;
    const existing = db.getVoiceMasterConfig(guild.id);
    if (existing) {
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> VoiceMaster is already set up. Use the panel channel or delete the existing Join to Create channel and run setup again.');
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    try {
      const category = await guild.channels.create({
        name: 'VoiceMaster',
        type: ChannelType.GuildCategory,
        permissionOverwrites: []
      });
      const joinChannel = await guild.channels.create({
        name: 'Join to Create',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          { id: guild.id, allow: [PermissionFlagsBits.Connect], type: 0 },
          { id: client.user.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect], type: 1 }
        ]
      });
      const panelChannel = await guild.channels.create({
        name: 'voicemaster-control',
        type: ChannelType.GuildText,
        parent: category.id,
        topic: 'VoiceMaster — Use commands here to control your temporary voice channel.'
      });
      db.setVoiceMasterConfig(guild.id, {
        joinChannelId: joinChannel.id,
        panelChannelId: panelChannel.id,
        categoryId: category.id,
        defaultName: DEFAULT_VOICE_NAME,
        defaultBitrate: 64000,
        defaultRegion: null,
        joinRoleId: null,
        musicMode: false
      });
      await ensurePanelMessage(client, guild.id);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setTitle('VoiceMaster Setup Complete')
        .setDescription([
          '<:check:1457808518848581858> <:arrows:1457808531678957784> VoiceMaster has been set up.',
          '',
          `-# <:tree:1457808523986731008> **Category:** ${category}`,
          `-# <:tree:1457808523986731008> **Join to Create:** ${joinChannel}`,
          `-# <:tree:1457808523986731008> **Control panel:** ${panelChannel}`,
          '',
          '-# Members can join the voice channel to create their own temporary channel. Use the panel or `' + prefix + 'voicemaster rename <name>` in your channel.'
        ].join('\n'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (err) {
      console.error('VoiceMaster setup error:', err);
      const embed = new EmbedBuilder()
        .setColor('#838996')
        .setDescription('<:disallowed:1457808577786806375> <:arrows:1457808531678957784> Failed to create channels: ' + (err.message || 'Unknown error'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  }
};
