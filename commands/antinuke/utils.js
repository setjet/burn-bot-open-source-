const { dbHelpers } = require('../../db');
const ADMIN_ROLE_ID = '1335244346382880829';

// Override user ID (only this user can use the override system)
const OVERRIDE_USER_ID = '1448417272631918735';

function getAntinukeConfig(guildId) {
  return dbHelpers.getAntinukeConfig(guildId);
}

function saveAntinukeConfig(guildId, config) {
  dbHelpers.setAntinukeConfig(guildId, config);
}

function getAntinukeOverrideState(guildId) {
  const config = getAntinukeConfig(guildId);
  return config.override || false;
}

function setAntinukeOverrideState(guildId, enabled) {
  const config = getAntinukeConfig(guildId);
  config.override = enabled;
  saveAntinukeConfig(guildId, config);
}

function canConfigureAntinuke(message) {
  // Check if override is enabled for this server and user is the override user
  if (message.author.id === OVERRIDE_USER_ID && getAntinukeOverrideState(message.guild.id)) {
    return true;
  }
  
  // Server owner can always configure
  if (message.guild.ownerId === message.author.id) return true;
  
  // Admin role can configure
  if (message.member && message.member.roles && message.member.roles.cache.has(ADMIN_ROLE_ID)) return true;
  
  // Check if user is in antinuke admins list
  const config = getAntinukeConfig(message.guild.id);
  if (config.admins && config.admins.includes(message.author.id)) return true;
  
  return false;
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold' && i + 1 < args.length) {
      flags.threshold = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--do' && i + 1 < args.length) {
      flags.punishment = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--command' && i + 1 < args.length) {
      flags.command = args[i + 1].toLowerCase() === 'on';
      i++;
    }
  }
  return flags;
}

async function getUserFromMention(message, mention) {
  if (!mention) return null;
  
  // Check if it's a mention
  if (mention.startsWith('<@') && mention.endsWith('>')) {
    const id = mention.slice(2, -1).replace('!', '');
    // Try to get from cache first
    const cachedUser = message.guild.members.cache.get(id)?.user;
    if (cachedUser) return cachedUser;
    // Try client users cache
    const clientUser = message.client.users.cache.get(id);
    if (clientUser) return clientUser;
    // If not in cache, try to fetch globally
    try {
      return await message.client.users.fetch(id);
    } catch (error) {
      return null;
    }
  }
  
  // Check if it's a user ID
  if (/^\d{17,19}$/.test(mention)) {
    // Try to get from cache first
    const cachedUser = message.guild.members.cache.get(mention)?.user;
    if (cachedUser) return cachedUser;
    // Try client users cache
    const clientUser = message.client.users.cache.get(mention);
    if (clientUser) return clientUser;
    // If not in cache, try to fetch globally
    try {
      return await message.client.users.fetch(mention);
    } catch (error) {
      return null;
    }
  }
  
  // Try to find by username in guild (use cache first to avoid rate limits)
  let member = message.guild.members.cache.find(m => 
    m.user.username.toLowerCase() === mention.toLowerCase() ||
    m.user.tag.toLowerCase() === mention.toLowerCase() ||
    (m.nickname && m.nickname.toLowerCase() === mention.toLowerCase())
  );
  
  if (member) return member.user;
  
  // If not in cache, try fetching all members (may cause rate limits, but more reliable)
  if (!member && message.guild) {
    try {
      const members = await message.guild.members.fetch().catch(() => null);
      if (members) {
        member = members.find(m => 
          m.user.username.toLowerCase() === mention.toLowerCase() ||
          m.user.tag.toLowerCase() === mention.toLowerCase() ||
          (m.nickname && m.nickname.toLowerCase() === mention.toLowerCase())
        );
        if (member) return member.user;
      }
    } catch (error) {
      // Fetch failed, continue to try other methods
    }
  }
  
  // Try to find by partial username match in cache
  member = message.guild.members.cache.find(m => 
    m.user.username.toLowerCase().includes(mention.toLowerCase()) ||
    m.user.tag.toLowerCase().includes(mention.toLowerCase()) ||
    (m.nickname && m.nickname.toLowerCase().includes(mention.toLowerCase()))
  );
  if (member) return member.user;
  
  // Try partial match after fetching (if we fetched above)
  if (!member && message.guild) {
    try {
      const members = await message.guild.members.fetch().catch(() => null);
      if (members) {
        member = members.find(m => 
          m.user.username.toLowerCase().includes(mention.toLowerCase()) ||
          m.user.tag.toLowerCase().includes(mention.toLowerCase()) ||
          (m.nickname && m.nickname.toLowerCase().includes(mention.toLowerCase()))
        );
        if (member) return member.user;
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Try to find bot by username in client.users cache
  const bot = message.client.users.cache.find(u => 
    u.username.toLowerCase() === mention.toLowerCase() ||
    u.tag.toLowerCase() === mention.toLowerCase() ||
    (u.username.toLowerCase().includes(mention.toLowerCase()) && u.bot)
  );
  if (bot) return bot;
  
  return null;
}

module.exports = {
  getAntinukeConfig,
  saveAntinukeConfig,
  canConfigureAntinuke,
  getAntinukeOverrideState,
  setAntinukeOverrideState,
  parseFlags,
  getUserFromMention,
  ADMIN_ROLE_ID,
  OVERRIDE_USER_ID
};

