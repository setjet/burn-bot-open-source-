const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database path (Railway volume or local)
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'bot.db')
  : path.join(__dirname, 'bot.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
  db.exec(`
    -- Blacklisted users
    CREATE TABLE IF NOT EXISTS blacklisted_users (
      user_id TEXT PRIMARY KEY
    );

    -- Blacklisted servers
    CREATE TABLE IF NOT EXISTS blacklisted_servers (
      server_id TEXT PRIMARY KEY
    );

    -- Economy balances
    CREATE TABLE IF NOT EXISTS economy_balances (
      user_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0
    );

    -- Economy cooldowns
    CREATE TABLE IF NOT EXISTS economy_cooldowns (
      user_id TEXT PRIMARY KEY,
      daily_cooldown INTEGER,
      work_cooldown INTEGER
    );

    -- Economy shop items
    CREATE TABLE IF NOT EXISTS economy_shop_items (
      guild_id TEXT,
      item_name TEXT,
      price INTEGER,
      role_id TEXT,
      description TEXT,
      PRIMARY KEY (guild_id, item_name)
    );

    -- Server prefixes
    CREATE TABLE IF NOT EXISTS server_prefixes (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT NOT NULL
    );

    -- Forced nicknames
    CREATE TABLE IF NOT EXISTS forced_nicknames (
      guild_id TEXT,
      user_id TEXT,
      nickname TEXT,
      PRIMARY KEY (guild_id, user_id)
    );

    -- Filtered words
    CREATE TABLE IF NOT EXISTS filtered_words (
      guild_id TEXT,
      word TEXT,
      PRIMARY KEY (guild_id, word)
    );

    -- Auto responses
    CREATE TABLE IF NOT EXISTS auto_responses (
      guild_id TEXT,
      trigger TEXT,
      response TEXT,
      PRIMARY KEY (guild_id, trigger)
    );

    -- Birthdays
    CREATE TABLE IF NOT EXISTS birthdays (
      user_id TEXT PRIMARY KEY,
      birthday TEXT NOT NULL
    );

    -- Hardbanned users (guild-specific)
    CREATE TABLE IF NOT EXISTS hardbanned_users (
      guild_id TEXT,
      user_id TEXT,
      PRIMARY KEY (guild_id, user_id)
    );

    -- Slur counts (stored as JSON to support multiple types)
    CREATE TABLE IF NOT EXISTS slur_counts (
      user_id TEXT PRIMARY KEY,
      counts_data TEXT
    );

    -- User timezones
    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL
    );

    -- Autoroles (guild-specific)
    CREATE TABLE IF NOT EXISTS autoroles (
      guild_id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL
    );

    -- Spam warnings
    CREATE TABLE IF NOT EXISTS spam_warnings (
      user_id TEXT PRIMARY KEY,
      warning_count INTEGER DEFAULT 0
    );

    -- Blacklist levels
    CREATE TABLE IF NOT EXISTS blacklist_levels (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 0
    );

    -- Blacklist expirations
    CREATE TABLE IF NOT EXISTS blacklist_expirations (
      user_id TEXT PRIMARY KEY,
      expiration INTEGER
    );

    -- Antinuke configs (stored as JSON)
    CREATE TABLE IF NOT EXISTS antinuke_configs (
      guild_id TEXT PRIMARY KEY,
      config_data TEXT
    );

    -- Command aliases (server-specific)
    CREATE TABLE IF NOT EXISTS command_aliases (
      guild_id TEXT,
      alias_name TEXT,
      command_string TEXT NOT NULL,
      PRIMARY KEY (guild_id, alias_name)
    );
  `);
}

// Initialize on load
initializeDatabase();

// Migrate existing tables if needed (for Railway deployments with old schema)
function migrateDatabase() {
  try {
    // Check if slur_counts table has old structure
    const tableInfo = db.prepare("PRAGMA table_info(slur_counts)").all();
    const hasCountColumn = tableInfo.some(col => col.name === 'count');
    const hasCountsDataColumn = tableInfo.some(col => col.name === 'counts_data');
    
    if (hasCountColumn && !hasCountsDataColumn) {
      console.log('Migrating slur_counts table to new structure...');
      // Migrate old data to new structure
      const oldRows = db.prepare('SELECT user_id, count FROM slur_counts').all();
      
      // Drop and recreate table with new structure
      db.exec('DROP TABLE IF EXISTS slur_counts');
      db.exec(`
        CREATE TABLE slur_counts (
          user_id TEXT PRIMARY KEY,
          counts_data TEXT
        )
      `);
      
      // Migrate old data (convert single count to JSON format)
      const insert = db.prepare('INSERT INTO slur_counts (user_id, counts_data) VALUES (?, ?)');
      for (const row of oldRows) {
        const countsData = JSON.stringify({ count: row.count || 0 });
        insert.run(row.user_id, countsData);
      }
      console.log(`Migrated ${oldRows.length} slur count records`);
    }
  } catch (error) {
    // Table might not exist yet, that's okay - it will be created with new structure
  }
  
  // Ensure new tables exist
  try {
    db.prepare('SELECT 1 FROM user_timezones LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_timezones (
        user_id TEXT PRIMARY KEY,
        timezone TEXT NOT NULL
      )
    `);
  }
  
  try {
    db.prepare('SELECT 1 FROM autoroles LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS autoroles (
        guild_id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL
      )
    `);
  }
}

// Run migrations
migrateDatabase();

// Helper functions for common operations
const dbHelpers = {
  // Blacklisted users
  isUserBlacklisted(userId) {
    const result = db.prepare('SELECT 1 FROM blacklisted_users WHERE user_id = ?').get(userId);
    return !!result;
  },

  addBlacklistedUser(userId) {
    db.prepare('INSERT OR IGNORE INTO blacklisted_users (user_id) VALUES (?)').run(userId);
  },

  removeBlacklistedUser(userId) {
    db.prepare('DELETE FROM blacklisted_users WHERE user_id = ?').run(userId);
  },

  getAllBlacklistedUsers() {
    const rows = db.prepare('SELECT user_id FROM blacklisted_users').all();
    return rows.map(row => row.user_id);
  },

  // Blacklisted servers
  isServerBlacklisted(serverId) {
    const result = db.prepare('SELECT 1 FROM blacklisted_servers WHERE server_id = ?').get(serverId);
    return !!result;
  },

  addBlacklistedServer(serverId) {
    db.prepare('INSERT OR IGNORE INTO blacklisted_servers (server_id) VALUES (?)').run(serverId);
  },

  removeBlacklistedServer(serverId) {
    db.prepare('DELETE FROM blacklisted_servers WHERE server_id = ?').run(serverId);
  },

  getAllBlacklistedServers() {
    const rows = db.prepare('SELECT server_id FROM blacklisted_servers').all();
    return rows.map(row => row.server_id);
  },

  // Economy
  getBalance(userId) {
    const row = db.prepare('SELECT balance FROM economy_balances WHERE user_id = ?').get(userId);
    return row ? row.balance : 0;
  },

  setBalance(userId, balance) {
    db.prepare('INSERT OR REPLACE INTO economy_balances (user_id, balance) VALUES (?, ?)').run(userId, balance);
  },

  addBalance(userId, amount) {
    const current = this.getBalance(userId);
    this.setBalance(userId, current + amount);
    return current + amount;
  },

  getDailyCooldown(userId) {
    const row = db.prepare('SELECT daily_cooldown FROM economy_cooldowns WHERE user_id = ?').get(userId);
    return row ? row.daily_cooldown : null;
  },

  setDailyCooldown(userId, timestamp) {
    db.prepare('INSERT OR REPLACE INTO economy_cooldowns (user_id, daily_cooldown) VALUES (?, ?)').run(userId, timestamp);
  },

  getWorkCooldown(userId) {
    const row = db.prepare('SELECT work_cooldown FROM economy_cooldowns WHERE user_id = ?').get(userId);
    return row ? row.work_cooldown : null;
  },

  setWorkCooldown(userId, timestamp) {
    db.prepare('INSERT OR REPLACE INTO economy_cooldowns (user_id, work_cooldown) VALUES (?, ?)').run(userId, timestamp);
  },

  // Server prefixes
  getServerPrefix(guildId) {
    const row = db.prepare('SELECT prefix FROM server_prefixes WHERE guild_id = ?').get(guildId);
    return row ? row.prefix : null;
  },

  setServerPrefix(guildId, prefix) {
    db.prepare('INSERT OR REPLACE INTO server_prefixes (guild_id, prefix) VALUES (?, ?)').run(guildId, prefix);
  },

  getAllServerPrefixes() {
    const rows = db.prepare('SELECT guild_id, prefix FROM server_prefixes').all();
    const result = {};
    rows.forEach(row => {
      result[row.guild_id] = row.prefix;
    });
    return result;
  },

  // Forced nicknames
  getForcedNickname(guildId, userId) {
    const row = db.prepare('SELECT nickname FROM forced_nicknames WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    return row ? row.nickname : null;
  },

  setForcedNickname(guildId, userId, nickname) {
    if (nickname) {
      db.prepare('INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES (?, ?, ?)').run(guildId, userId, nickname);
    } else {
      db.prepare('DELETE FROM forced_nicknames WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    }
  },

  getGuildForcedNicknames(guildId) {
    const rows = db.prepare('SELECT user_id, nickname FROM forced_nicknames WHERE guild_id = ?').all();
    const result = new Map();
    rows.forEach(row => {
      result.set(row.user_id, row.nickname);
    });
    return result;
  },

  // Filtered words
  getFilteredWords(guildId) {
    const rows = db.prepare('SELECT word FROM filtered_words WHERE guild_id = ?').all();
    return new Set(rows.map(row => row.word));
  },

  addFilteredWord(guildId, word) {
    db.prepare('INSERT OR IGNORE INTO filtered_words (guild_id, word) VALUES (?, ?)').run(guildId, word);
  },

  removeFilteredWord(guildId, word) {
    db.prepare('DELETE FROM filtered_words WHERE guild_id = ? AND word = ?').run(guildId, word);
  },

  // Auto responses
  getAutoResponses(guildId) {
    const rows = db.prepare('SELECT trigger, response FROM auto_responses WHERE guild_id = ?').all();
    const result = new Map();
    rows.forEach(row => {
      result.set(row.trigger, row.response);
    });
    return result;
  },

  setAutoResponse(guildId, trigger, response) {
    if (response) {
      db.prepare('INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response) VALUES (?, ?, ?)').run(guildId, trigger, response);
    } else {
      db.prepare('DELETE FROM auto_responses WHERE guild_id = ? AND trigger = ?').run(guildId, trigger);
    }
  },

  // Birthdays
  getBirthday(userId) {
    const row = db.prepare('SELECT birthday FROM birthdays WHERE user_id = ?').get(userId);
    return row ? row.birthday : null;
  },

  setBirthday(userId, birthday) {
    if (birthday) {
      db.prepare('INSERT OR REPLACE INTO birthdays (user_id, birthday) VALUES (?, ?)').run(userId, birthday);
    } else {
      db.prepare('DELETE FROM birthdays WHERE user_id = ?').run(userId);
    }
  },

  getAllBirthdays() {
    const rows = db.prepare('SELECT user_id, birthday FROM birthdays').all();
    const result = new Map();
    rows.forEach(row => {
      result.set(row.user_id, row.birthday);
    });
    return result;
  },

  // Hardbanned users
  getHardbannedUsers(guildId) {
    const rows = db.prepare('SELECT user_id FROM hardbanned_users WHERE guild_id = ?').all();
    return rows.map(row => row.user_id);
  },

  addHardbannedUser(guildId, userId) {
    db.prepare('INSERT OR IGNORE INTO hardbanned_users (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
  },

  removeHardbannedUser(guildId, userId) {
    db.prepare('DELETE FROM hardbanned_users WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  },

  getAllHardbannedUsers() {
    const rows = db.prepare('SELECT guild_id, user_id FROM hardbanned_users').all();
    const result = {};
    rows.forEach(row => {
      if (!result[row.guild_id]) result[row.guild_id] = [];
      result[row.guild_id].push(row.user_id);
    });
    return result;
  },

  // Slur counts (stored as JSON)
  getSlurCounts(userId) {
    try {
      const row = db.prepare('SELECT counts_data FROM slur_counts WHERE user_id = ?').get(userId);
      if (row && row.counts_data) {
        return JSON.parse(row.counts_data);
      }
    } catch (error) {
      // Fallback for old structure
      if (error.message.includes('no such column')) {
        try {
          const row = db.prepare('SELECT count FROM slur_counts WHERE user_id = ?').get(userId);
          if (row) {
            return { count: row.count || 0 };
          }
        } catch (e) {
          // Table might not exist
        }
      }
    }
    return {};
  },

  setSlurCounts(userId, counts) {
    try {
      const countsData = JSON.stringify(counts);
      db.prepare('INSERT OR REPLACE INTO slur_counts (user_id, counts_data) VALUES (?, ?)').run(userId, countsData);
    } catch (error) {
      // If column doesn't exist, migrate first
      if (error.message.includes('no such column')) {
        migrateDatabase();
        // Retry after migration
        const countsData = JSON.stringify(counts);
        db.prepare('INSERT OR REPLACE INTO slur_counts (user_id, counts_data) VALUES (?, ?)').run(userId, countsData);
      } else {
        throw error;
      }
    }
  },

  incrementSlurCount(userId, type = 'default') {
    const counts = this.getSlurCounts(userId);
    const key = type === 'default' ? 'count' : `${type}_count`;
    counts[key] = (counts[key] || 0) + 1;
    this.setSlurCounts(userId, counts);
    return counts[key];
  },

  getAllSlurCounts() {
    try {
      const rows = db.prepare('SELECT user_id, counts_data FROM slur_counts').all();
      const result = {};
      rows.forEach(row => {
        if (row.counts_data) {
          result[row.user_id] = JSON.parse(row.counts_data);
        } else {
          result[row.user_id] = {};
        }
      });
      return result;
    } catch (error) {
      // Fallback for old structure - try to migrate
      if (error.message.includes('no such column') || error.message.includes('counts_data')) {
        try {
          // Check table structure and migrate if needed
          const tableInfo = db.prepare("PRAGMA table_info(slur_counts)").all();
          const hasCountColumn = tableInfo.some(col => col.name === 'count');
          const hasCountsDataColumn = tableInfo.some(col => col.name === 'counts_data');
          
          if (hasCountColumn && !hasCountsDataColumn) {
            console.log('Auto-migrating slur_counts table...');
            const oldRows = db.prepare('SELECT user_id, count FROM slur_counts').all();
            db.exec('DROP TABLE IF EXISTS slur_counts');
            db.exec(`CREATE TABLE slur_counts (user_id TEXT PRIMARY KEY, counts_data TEXT)`);
            const insert = db.prepare('INSERT INTO slur_counts (user_id, counts_data) VALUES (?, ?)');
            for (const row of oldRows) {
              insert.run(row.user_id, JSON.stringify({ count: row.count || 0 }));
            }
            console.log(`Migrated ${oldRows.length} records`);
            
            // Retry after migration
            const rows = db.prepare('SELECT user_id, counts_data FROM slur_counts').all();
            const result = {};
            rows.forEach(row => {
              if (row.counts_data) {
                result[row.user_id] = JSON.parse(row.counts_data);
              } else {
                result[row.user_id] = {};
              }
            });
            return result;
          }
        } catch (e) {
          console.error('Migration failed:', e.message);
          return {};
        }
      }
      return {};
    }
  },

  // Spam warnings
  getSpamWarningCount(userId) {
    const row = db.prepare('SELECT warning_count FROM spam_warnings WHERE user_id = ?').get(userId);
    return row ? row.warning_count : 0;
  },

  setSpamWarningCount(userId, count) {
    if (count > 0) {
      db.prepare('INSERT OR REPLACE INTO spam_warnings (user_id, warning_count) VALUES (?, ?)').run(userId, count);
    } else {
      db.prepare('DELETE FROM spam_warnings WHERE user_id = ?').run(userId);
    }
  },

  // Blacklist levels
  getBlacklistLevel(userId) {
    const row = db.prepare('SELECT level FROM blacklist_levels WHERE user_id = ?').get(userId);
    return row ? row.level : 0;
  },

  setBlacklistLevel(userId, level) {
    if (level > 0) {
      db.prepare('INSERT OR REPLACE INTO blacklist_levels (user_id, level) VALUES (?, ?)').run(userId, level);
    } else {
      db.prepare('DELETE FROM blacklist_levels WHERE user_id = ?').run(userId);
    }
  },

  // Blacklist expirations
  getBlacklistExpiration(userId) {
    const row = db.prepare('SELECT expiration FROM blacklist_expirations WHERE user_id = ?').get(userId);
    return row ? row.expiration : null;
  },

  setBlacklistExpiration(userId, expiration) {
    if (expiration) {
      db.prepare('INSERT OR REPLACE INTO blacklist_expirations (user_id, expiration) VALUES (?, ?)').run(userId, expiration);
    } else {
      db.prepare('DELETE FROM blacklist_expirations WHERE user_id = ?').run(userId);
    }
  },

  // User timezones
  getUserTimezone(userId) {
    const row = db.prepare('SELECT timezone FROM user_timezones WHERE user_id = ?').get(userId);
    return row ? row.timezone : null;
  },

  setUserTimezone(userId, timezone) {
    if (timezone) {
      db.prepare('INSERT OR REPLACE INTO user_timezones (user_id, timezone) VALUES (?, ?)').run(userId, timezone);
    } else {
      db.prepare('DELETE FROM user_timezones WHERE user_id = ?').run(userId);
    }
  },

  // Autoroles
  getAutorole(guildId) {
    const row = db.prepare('SELECT role_id FROM autoroles WHERE guild_id = ?').get(guildId);
    return row ? row.role_id : null;
  },

  setAutorole(guildId, roleId) {
    if (roleId) {
      db.prepare('INSERT OR REPLACE INTO autoroles (guild_id, role_id) VALUES (?, ?)').run(guildId, roleId);
    } else {
      db.prepare('DELETE FROM autoroles WHERE guild_id = ?').run(guildId);
    }
  },

  // Antinuke configs
  getAntinukeConfig(guildId) {
    const row = db.prepare('SELECT config_data FROM antinuke_configs WHERE guild_id = ?').get(guildId);
    if (row && row.config_data) {
      return JSON.parse(row.config_data);
    }
    return {
      modules: {},
      whitelist: [],
      admins: [],
      timeWindow: 10000,
      logChannel: null,
      override: false
    };
  },

  setAntinukeConfig(guildId, config) {
    const configData = JSON.stringify(config);
    db.prepare('INSERT OR REPLACE INTO antinuke_configs (guild_id, config_data) VALUES (?, ?)').run(guildId, configData);
  },

  // Economy shop items
  getShopItems(guildId) {
    const rows = db.prepare('SELECT item_name, price, role_id, description FROM economy_shop_items WHERE guild_id = ?').all();
    return rows.map(row => ({
      name: row.item_name,
      price: row.price,
      roleId: row.role_id,
      description: row.description
    }));
  },

  setShopItems(guildId, items) {
    // Delete existing items for this guild
    db.prepare('DELETE FROM economy_shop_items WHERE guild_id = ?').run(guildId);
    // Insert new items
    const insert = db.prepare('INSERT INTO economy_shop_items (guild_id, item_name, price, role_id, description) VALUES (?, ?, ?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(guildId, item.name, item.price, item.roleId || null, item.description || null);
      }
    });
    insertMany(items);
  },

  // Command aliases
  getAlias(guildId, aliasName) {
    const result = db.prepare('SELECT command_string FROM command_aliases WHERE guild_id = ? AND alias_name = ?').get(guildId, aliasName.toLowerCase());
    return result ? result.command_string : null;
  },

  setAlias(guildId, aliasName, commandString) {
    db.prepare('INSERT OR REPLACE INTO command_aliases (guild_id, alias_name, command_string) VALUES (?, ?, ?)')
      .run(guildId, aliasName.toLowerCase(), commandString);
  },

  removeAlias(guildId, aliasName) {
    db.prepare('DELETE FROM command_aliases WHERE guild_id = ? AND alias_name = ?')
      .run(guildId, aliasName.toLowerCase());
  },

  getAllAliases(guildId) {
    const rows = db.prepare('SELECT alias_name, command_string FROM command_aliases WHERE guild_id = ? ORDER BY alias_name').all(guildId);
    return rows.map(row => ({ name: row.alias_name, command: row.command_string }));
  },

  removeAllAliases(guildId) {
    db.prepare('DELETE FROM command_aliases WHERE guild_id = ?').run(guildId);
  }
};

module.exports = {
  db,
  dbHelpers,
  initializeDatabase
};

