const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { dbHelpers } = require('../../db');

const RENAME_COOLDOWN_MS = 60000; // 1 minute per user
const DEFAULT_VOICE_NAME = "{user.display_name}'s channel";

// template placeholders — one typo in regex and everyone's channel was named "{user" 😭

function resolveDefaultName(template, member) {
  if (!member || !template) return DEFAULT_VOICE_NAME;
  return template
    .replace(/\{user\}/g, member.user.toString())
    .replace(/\{user\.name\}/g, member.user.username)
    .replace(/\{user\.display_name\}/g, member.displayName || member.user.username);
}

// Only the user who created/owns the voice channel can control it (lock, unlock, rename, permit, etc.)
function canControlChannel(member, channelData) {
  if (!channelData) return false;
  return channelData.ownerId === member.id;
}

function buildPanelEmbed(guildId, client) {
  const config = dbHelpers.getVoiceMasterConfig(guildId);
  if (!config) return null;
  const guild = client?.guilds?.cache?.get(guildId);
  const embed = new EmbedBuilder()
    .setColor(0x00BFFF) // light blue accent
    .setAuthor({ name: guild?.name || 'VoiceMaster' })
    .setTitle('VoiceMaster Interface')
    .setDescription('Click the buttons below to control your voice channel')
    .setThumbnail(guild?.iconURL({ size: 128 }) || client?.user?.displayAvatarURL({ size: 128 }) || null)
    .addFields({
      name: 'Button Usage',
      value: [
        '🔒 — **Lock** the voice channel',
        '🔓 — **Unlock** the voice channel',
        '👁️ — **Ghost** the voice channel',
        '👁️ — **Reveal** the voice channel',
        '🎤 — **Claim** the voice channel',
        '🔨 — **Disconnect** a member',
        '💻 — **Start** a new voice channel activity',
        '📅 — **View** channel information',
        '➕ — **Increase** the user limit',
        '➖ — **Decrease** the user limit'
      ].join('\n'),
      inline: false
    });
  return embed;
}

function buildPanelComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('voicemaster-lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-ghost').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-reveal').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-claim').setEmoji('🎤').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('voicemaster-disconnect').setEmoji('🔨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-activity').setEmoji('💻').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-info').setEmoji('📅').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-limit-up').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('voicemaster-limit-down').setEmoji('➖').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

async function ensurePanelMessage(client, guildId) {
  const config = dbHelpers.getVoiceMasterConfig(guildId);
  if (!config) return;
  const channel = await client.channels.fetch(config.panelChannelId).catch(() => null);
  if (!channel) return;
  const embeds = [buildPanelEmbed(guildId, client)];
  const components = buildPanelComponents();
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => new Map());
  const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('VoiceMaster'));
  if (botMsg) {
    await botMsg.edit({ embeds, components }).catch(() => {});
  } else {
    await channel.send({ embeds, components }).catch(() => {});
  }
}

module.exports = {
  RENAME_COOLDOWN_MS,
  DEFAULT_VOICE_NAME,
  resolveDefaultName,
  canControlChannel,
  buildPanelEmbed,
  buildPanelComponents,
  ensurePanelMessage
};
