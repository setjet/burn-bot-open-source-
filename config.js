require('dotenv').config();
const crypto = require('crypto');

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  botOwnerId: process.env.BOT_OWNER_ID || '',
  adminRoleId: process.env.ADMIN_ROLE_ID || '',
  blacklistLogChannelId: process.env.BLACKLIST_LOG_CHANNEL_ID || '',
  guildJoinLogChannelId: process.env.GUILD_JOIN_LOG_CHANNEL_ID || '',
  supportServerUrl: process.env.SUPPORT_SERVER_URL || 'https://discord.com',
  antinukeOverrideUserId: process.env.ANTINUKE_OVERRIDE_USER_ID || '',
  ticketStaffRoleId: process.env.TICKET_STAFF_ROLE_ID || '',
  ticketSupportCategoryId: process.env.TICKET_SUPPORT_CATEGORY_ID || '',
  ticketBugsCategoryId: process.env.TICKET_BUGS_CATEGORY_ID || '',
  botWebsiteUrl: process.env.BOT_WEBSITE_URL || '',
  blacklistCommandLogChannelId: process.env.BLACKLIST_COMMAND_LOG_CHANNEL_ID || '',
  commandErrorLogChannelId: process.env.COMMAND_ERROR_LOG_CHANNEL_ID || '',
  cryptoBotGuildId: process.env.CRYPTO_BOT_GUILD_ID || '',
  cryptoPremiumRoleId: process.env.CRYPTO_PREMIUM_ROLE_ID || '',
  verificationUrl: process.env.VERIFICATION_URL || '',
  verificationApiPort: parseInt(process.env.VERIFICATION_API_PORT || '3001', 10),
  verificationApiSecret: process.env.VERIFICATION_API_SECRET || crypto.randomBytes(32).toString('hex'),
  verificationFrontendUrl: process.env.VERIFICATION_FRONTEND_URL || '*',
  etherscanApiKey: process.env.ETHERSCAN_API_KEY || '',
  railwayVolumeMountPath: process.env.RAILWAY_VOLUME_MOUNT_PATH || '',
  developerCreditLine: process.env.DEVELOPER_CREDIT_LINE || '',
  welcomeSupportChannelId: process.env.WELCOME_SUPPORT_CHANNEL_ID || '',
  welcomeGuideChannelId: process.env.WELCOME_GUIDE_CHANNEL_ID || '',
  welcomeSuggestionsChannelId: process.env.WELCOME_SUGGESTIONS_CHANNEL_ID || '',
  welcomeUpdatesChannelId: process.env.WELCOME_UPDATES_CHANNEL_ID || ''
};
