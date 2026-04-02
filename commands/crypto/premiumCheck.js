const config = require('../../config');

async function assertCryptoPremium(message, client, dbHelpers) {
  if (!message.guild) return false;
  if (dbHelpers.isCryptoAllowedUser(message.author.id)) return true;
  // allowlist bypass: the cheat code for friends who refuse to join the premium guild 😭
  const { cryptoBotGuildId, cryptoPremiumRoleId } = config;
  if (!cryptoBotGuildId || !cryptoPremiumRoleId) return true;
  // self-hosters leave both blank → everyone passes; prod uses the gate 😭
  try {
    const botServer = client.guilds.cache.get(cryptoBotGuildId);
    if (!botServer) return false;
    const memberInBotServer = await botServer.members.fetch(message.author.id).catch(() => null);
    return !!(memberInBotServer && memberInBotServer.roles.cache.has(cryptoPremiumRoleId));
  } catch {
    // member fetch failed — treat as no access, not as "free crypto" 😭
    return false;
  }
}

module.exports = { assertCryptoPremium };
