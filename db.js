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
      strict INTEGER DEFAULT 0,
      reply INTEGER DEFAULT 0,
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

    -- Welcome messages (DM-only, guild-specific)
    CREATE TABLE IF NOT EXISTS welcome_messages (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      message TEXT NOT NULL,
      link TEXT
    );

    -- Bot server welcome message (embed in channel)
    CREATE TABLE IF NOT EXISTS bot_welcome (
      id TEXT PRIMARY KEY DEFAULT 'bot_server',
      enabled INTEGER DEFAULT 0,
      channel_id TEXT,
      title TEXT,
      description TEXT,
      color TEXT DEFAULT '#838996',
      thumbnail_url TEXT,
      image_url TEXT,
      footer_text TEXT
    );

    -- Burn welcome messages (channel-based, separate from DM welcome)
    CREATE TABLE IF NOT EXISTS burn_welcome (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      channel_id TEXT
    );

    -- Logging system
    CREATE TABLE IF NOT EXISTS logging_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      enabled INTEGER DEFAULT 0,
      log_events TEXT
    );

    -- Raid protection
    CREATE TABLE IF NOT EXISTS raid_protection (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      member_threshold INTEGER DEFAULT 5,
      time_window INTEGER DEFAULT 10000,
      action TEXT DEFAULT 'lockdown',
      whitelist TEXT
    );

    -- Link filter
    CREATE TABLE IF NOT EXISTS link_filter (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      actions TEXT DEFAULT '["delete"]',
      whitelist TEXT,
      allowed_domains TEXT
    );

    -- Economy leaderboard bans
    CREATE TABLE IF NOT EXISTS economy_leaderboard_bans (
      user_id TEXT PRIMARY KEY
    );

    -- Crypto wallets
    CREATE TABLE IF NOT EXISTS crypto_wallets (
      user_id TEXT,
      currency TEXT,
      address TEXT,
      verified INTEGER DEFAULT 0,
      verification_code TEXT,
      verification_message TEXT,
      verification_timestamp INTEGER,
      PRIMARY KEY (user_id, currency)
    );

    -- Verification nonces (for web-based verification)
    CREATE TABLE IF NOT EXISTS verification_nonces (
      nonce TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      currency TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0
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
      
      // Migrate old data (preserve existing counts structure if possible)
      const insert = db.prepare('INSERT INTO slur_counts (user_id, counts_data) VALUES (?, ?)');
      for (const row of oldRows) {
        // Try to preserve existing structure, or use default
        let countsData;
        try {
          // If counts_data already exists as JSON in old format, preserve it
          if (row.counts_data) {
            countsData = row.counts_data;
          } else {
            // Otherwise, convert old single count to new format
            countsData = JSON.stringify({ count: row.count || 0 });
          }
        } catch (e) {
          // Fallback to default structure
          countsData = JSON.stringify({ count: row.count || 0 });
        }
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
  
  // Migrate auto_responses table to add strict and reply columns
  try {
    const autoRespTableInfo = db.prepare("PRAGMA table_info(auto_responses)").all();
    const hasStrictColumn = autoRespTableInfo.some(col => col.name === 'strict');
    const hasReplyColumn = autoRespTableInfo.some(col => col.name === 'reply');
    
    if (!hasStrictColumn || !hasReplyColumn) {
      console.log('Migrating auto_responses table to add strict and reply columns...');
      if (!hasStrictColumn) {
        db.exec('ALTER TABLE auto_responses ADD COLUMN strict INTEGER DEFAULT 0');
      }
      if (!hasReplyColumn) {
        db.exec('ALTER TABLE auto_responses ADD COLUMN reply INTEGER DEFAULT 0');
      }
      console.log('Migration complete: added strict and reply columns to auto_responses');
    }
  } catch (error) {
    // Table might not exist yet, that's okay - it will be created with new structure
  }

  // Ensure welcome_messages table exists
  try {
    db.prepare('SELECT 1 FROM welcome_messages LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS welcome_messages (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        message TEXT NOT NULL,
        link TEXT,
        channel_id TEXT
      )
    `);
  }

  // Migrate welcome_messages table to add channel_id column
  try {
    const welcomeTableInfo = db.prepare("PRAGMA table_info(welcome_messages)").all();
    const hasChannelIdColumn = welcomeTableInfo.some(col => col.name === 'channel_id');
    
    if (!hasChannelIdColumn) {
      console.log('Migrating welcome_messages table to add channel_id column...');
      db.exec('ALTER TABLE welcome_messages ADD COLUMN channel_id TEXT');
      console.log('Migration complete: added channel_id column to welcome_messages');
    }
  } catch (error) {
    // Table might not exist yet, that's okay
  }

  // Ensure bot_welcome table exists
  try {
    db.prepare('SELECT 1 FROM bot_welcome LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bot_welcome (
        id TEXT PRIMARY KEY DEFAULT 'bot_server',
        enabled INTEGER DEFAULT 0,
        channel_id TEXT,
        title TEXT,
        description TEXT,
        color TEXT DEFAULT '#838996',
        thumbnail_url TEXT,
        image_url TEXT,
        footer_text TEXT
      )
    `);
  }

  // Ensure burn_welcome table exists
  try {
    db.prepare('SELECT 1 FROM burn_welcome LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS burn_welcome (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        channel_id TEXT
      )
    `);
  }

  // Ensure logging_config table exists
  try {
    db.prepare('SELECT 1 FROM logging_config LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS logging_config (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT,
        enabled INTEGER DEFAULT 0,
        log_events TEXT
      )
    `);
  }

  // Ensure raid_protection table exists
  try {
    db.prepare('SELECT 1 FROM raid_protection LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS raid_protection (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        member_threshold INTEGER DEFAULT 5,
        time_window INTEGER DEFAULT 10000,
        action TEXT DEFAULT 'lockdown',
        whitelist TEXT
      )
    `);
  }

  // Ensure link_filter table exists
  try {
    db.prepare('SELECT 1 FROM link_filter LIMIT 1').get();
  } catch (error) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS link_filter (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        actions TEXT DEFAULT '["delete"]',
        whitelist TEXT,
        allowed_domains TEXT
      )
    `);
  }

  // Migrate link_filter table from 'action' to 'actions'
  try {
    const linkFilterTableInfo = db.prepare("PRAGMA table_info(link_filter)").all();
    const hasActionColumn = linkFilterTableInfo.some(col => col.name === 'action');
    const hasActionsColumn = linkFilterTableInfo.some(col => col.name === 'actions');
    
    if (hasActionColumn && !hasActionsColumn) {
      console.log('Migrating link_filter table from action to actions...');
      db.exec('ALTER TABLE link_filter ADD COLUMN actions TEXT DEFAULT \'["delete"]\'');
      
      // Migrate existing data
      const rows = db.prepare('SELECT guild_id, action FROM link_filter WHERE action IS NOT NULL').all();
      for (const row of rows) {
        const actionsJson = JSON.stringify([row.action || 'delete']);
        db.prepare('UPDATE link_filter SET actions = ? WHERE guild_id = ?').run(actionsJson, row.guild_id);
      }
      console.log('Migration complete: converted action to actions array');
    }
  } catch (error) {
    // Table might not exist yet, that's okay
  }

  // Migrate crypto_wallets table to add verification columns
  try {
    const cryptoWalletsTableInfo = db.prepare("PRAGMA table_info(crypto_wallets)").all();
    const hasVerificationMessage = cryptoWalletsTableInfo.some(col => col.name === 'verification_message');
    const hasVerificationTimestamp = cryptoWalletsTableInfo.some(col => col.name === 'verification_timestamp');
    
    if (!hasVerificationMessage || !hasVerificationTimestamp) {
      console.log('Migrating crypto_wallets table to add verification columns...');
      if (!hasVerificationMessage) {
        db.exec('ALTER TABLE crypto_wallets ADD COLUMN verification_message TEXT');
      }
      if (!hasVerificationTimestamp) {
        db.exec('ALTER TABLE crypto_wallets ADD COLUMN verification_timestamp INTEGER');
      }
      console.log('Migration complete: added verification_message and verification_timestamp columns to crypto_wallets');
    }
  } catch (error) {
    // Table might not exist yet, that's okay - it will be created with new structure
    console.error('Error migrating crypto_wallets table:', error.message);
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
    try {
      // Try to get with new columns first
      const rows = db.prepare('SELECT trigger, response, strict, reply FROM auto_responses WHERE guild_id = ?').all(guildId);
      const result = new Map();
      rows.forEach(row => {
        result.set(row.trigger, {
          response: row.response,
          strict: row.strict === 1 || false,
          reply: row.reply === 1 || false
        });
      });
      return result;
    } catch (error) {
      // If columns don't exist yet, fallback to old query
      if (error.code === 'SQLITE_ERROR' && error.message.includes('no such column')) {
        try {
          const rows = db.prepare('SELECT trigger, response FROM auto_responses WHERE guild_id = ?').all(guildId);
          const result = new Map();
          rows.forEach(row => {
            result.set(row.trigger, {
              response: row.response,
              strict: false,
              reply: false
            });
          });
          return result;
        } catch (fallbackError) {
          return new Map();
        }
      }
      return new Map();
    }
  },

  setAutoResponse(guildId, trigger, response, strict = false, reply = false) {
    if (response) {
      db.prepare('INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response, strict, reply) VALUES (?, ?, ?, ?, ?)').run(
        guildId, 
        trigger, 
        response, 
        strict ? 1 : 0, 
        reply ? 1 : 0
      );
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
    const rows = db.prepare('SELECT user_id FROM hardbanned_users WHERE guild_id = ?').all(guildId);
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
        const parsed = JSON.parse(row.counts_data);
        // Ensure it's an object (not null or undefined)
        return parsed && typeof parsed === 'object' ? parsed : {};
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
    // Return empty object if user doesn't exist (allows setting new counts)
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
              // Preserve existing counts structure if it exists, otherwise use default
              let countsData;
              try {
                // Check if we can get the old counts_data from a backup or existing structure
                // For now, preserve the count value in a way that maintains compatibility
                countsData = JSON.stringify({ count: row.count || 0 });
              } catch (e) {
                countsData = JSON.stringify({ count: row.count || 0 });
              }
              insert.run(row.user_id, countsData);
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
  },

  // Welcome messages
  getWelcomeMessage(guildId) {
    const row = db.prepare('SELECT enabled, message, link, channel_id FROM welcome_messages WHERE guild_id = ?').get(guildId);
    if (!row) return null;
    return {
      enabled: row.enabled === 1,
      message: row.message,
      link: row.link || null,
      channelId: row.channel_id || null
    };
  },

  setWelcomeMessage(guildId, message, link = null, channelId = null) {
    db.prepare('INSERT OR REPLACE INTO welcome_messages (guild_id, message, link, channel_id) VALUES (?, ?, ?, ?)')
      .run(guildId, message, link, channelId);
  },

  setWelcomeChannel(guildId, channelId) {
    const exists = db.prepare('SELECT 1 FROM welcome_messages WHERE guild_id = ?').get(guildId);
    if (exists) {
      db.prepare('UPDATE welcome_messages SET channel_id = ? WHERE guild_id = ?').run(channelId, guildId);
    } else {
      // Create entry if it doesn't exist
      db.prepare('INSERT INTO welcome_messages (guild_id, message, channel_id) VALUES (?, ?, ?)')
        .run(guildId, 'Welcome!', channelId);
    }
  },

  setWelcomeEnabled(guildId, enabled) {
    const enabledInt = enabled ? 1 : 0;
    // Check if welcome message exists
    const exists = db.prepare('SELECT 1 FROM welcome_messages WHERE guild_id = ?').get(guildId);
    if (exists) {
      db.prepare('UPDATE welcome_messages SET enabled = ? WHERE guild_id = ?').run(enabledInt, guildId);
    }
  },

  removeWelcomeMessage(guildId) {
    db.prepare('DELETE FROM welcome_messages WHERE guild_id = ?').run(guildId);
  },

  // Bot server welcome message
  getBotWelcome() {
    const row = db.prepare('SELECT enabled, channel_id, title, description, color, thumbnail_url, image_url, footer_text FROM bot_welcome WHERE id = ?').get('bot_server');
    if (!row) return null;
    return {
      enabled: row.enabled === 1,
      channelId: row.channel_id,
      title: row.title,
      description: row.description,
      color: row.color || '#838996',
      thumbnailUrl: row.thumbnail_url,
      imageUrl: row.image_url,
      footerText: row.footer_text
    };
  },

  setBotWelcome(config) {
    const enabledInt = config.enabled ? 1 : 0;
    db.prepare(`
      INSERT OR REPLACE INTO bot_welcome 
      (id, enabled, channel_id, title, description, color, thumbnail_url, image_url, footer_text) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'bot_server',
      enabledInt,
      config.channelId || null,
      config.title || null,
      config.description || null,
      config.color || '#838996',
      config.thumbnailUrl || null,
      config.imageUrl || null,
      config.footerText || null
    );
  },

  setBotWelcomeEnabled(enabled) {
    const enabledInt = enabled ? 1 : 0;
    const exists = db.prepare('SELECT 1 FROM bot_welcome WHERE id = ?').get('bot_server');
    if (exists) {
      db.prepare('UPDATE bot_welcome SET enabled = ? WHERE id = ?').run(enabledInt, 'bot_server');
    }
  },

  removeBotWelcome() {
    db.prepare('DELETE FROM bot_welcome WHERE id = ?').run('bot_server');
  },

  // Burn welcome messages (separate from DM welcome)
  getBurnWelcome(guildId) {
    const row = db.prepare('SELECT enabled, channel_id FROM burn_welcome WHERE guild_id = ?').get(guildId);
    if (!row) return null;
    return {
      enabled: row.enabled === 1,
      channelId: row.channel_id || null
    };
  },

  setBurnWelcomeChannel(guildId, channelId) {
    const exists = db.prepare('SELECT 1 FROM burn_welcome WHERE guild_id = ?').get(guildId);
    if (exists) {
      db.prepare('UPDATE burn_welcome SET channel_id = ? WHERE guild_id = ?').run(channelId, guildId);
    } else {
      db.prepare('INSERT INTO burn_welcome (guild_id, channel_id) VALUES (?, ?)').run(guildId, channelId);
    }
  },

  setBurnWelcomeEnabled(guildId, enabled) {
    const enabledInt = enabled ? 1 : 0;
    const exists = db.prepare('SELECT 1 FROM burn_welcome WHERE guild_id = ?').get(guildId);
    if (exists) {
      db.prepare('UPDATE burn_welcome SET enabled = ? WHERE guild_id = ?').run(enabledInt, guildId);
    }
  },

  removeBurnWelcome(guildId) {
    db.prepare('DELETE FROM burn_welcome WHERE guild_id = ?').run(guildId);
  },

  // Economy leaderboard bans
  getLeaderboardBannedUsers() {
    const rows = db.prepare('SELECT user_id FROM economy_leaderboard_bans').all();
    return new Set(rows.map(row => row.user_id));
  },

  addLeaderboardBan(userId) {
    db.prepare('INSERT OR IGNORE INTO economy_leaderboard_bans (user_id) VALUES (?)').run(userId);
  },

  removeLeaderboardBan(userId) {
    db.prepare('DELETE FROM economy_leaderboard_bans WHERE user_id = ?').run(userId);
  },

  isLeaderboardBanned(userId) {
    const row = db.prepare('SELECT 1 FROM economy_leaderboard_bans WHERE user_id = ?').get(userId);
    return !!row;
  },

  // Logging system
  getLoggingConfig(guildId) {
    const row = db.prepare('SELECT channel_id, enabled, log_events FROM logging_config WHERE guild_id = ?').get(guildId);
    if (!row) return null;
    return {
      channelId: row.channel_id || null,
      enabled: row.enabled === 1,
      logEvents: row.log_events ? JSON.parse(row.log_events) : []
    };
  },

  setLoggingConfig(guildId, channelId, enabled, logEvents) {
    const enabledInt = enabled ? 1 : 0;
    const eventsJson = JSON.stringify(logEvents || []);
    db.prepare('INSERT OR REPLACE INTO logging_config (guild_id, channel_id, enabled, log_events) VALUES (?, ?, ?, ?)')
      .run(guildId, channelId, enabledInt, eventsJson);
  },

  // Raid protection
  getRaidProtection(guildId) {
    const row = db.prepare('SELECT enabled, member_threshold, time_window, action, whitelist FROM raid_protection WHERE guild_id = ?').get(guildId);
    if (!row) return null;
    return {
      enabled: row.enabled === 1,
      memberThreshold: row.member_threshold || 5,
      timeWindow: row.time_window || 10000,
      action: row.action || 'lockdown',
      whitelist: row.whitelist ? JSON.parse(row.whitelist) : []
    };
  },

  setRaidProtection(guildId, config) {
    const enabledInt = config.enabled ? 1 : 0;
    const whitelistJson = JSON.stringify(config.whitelist || []);
    db.prepare('INSERT OR REPLACE INTO raid_protection (guild_id, enabled, member_threshold, time_window, action, whitelist) VALUES (?, ?, ?, ?, ?, ?)')
      .run(guildId, enabledInt, config.memberThreshold || 5, config.timeWindow || 10000, config.action || 'lockdown', whitelistJson);
  },

  // Link filter
  getLinkFilter(guildId) {
    const row = db.prepare('SELECT enabled, actions, whitelist, allowed_domains FROM link_filter WHERE guild_id = ?').get(guildId);
    if (!row) return null;
    
    // Handle migration from old 'action' field to 'actions' array
    let actions = [];
    if (row.actions) {
      try {
        actions = JSON.parse(row.actions);
      } catch (e) {
        // If parsing fails, might be old format
        actions = row.actions ? [row.actions] : ['delete'];
      }
    } else {
      // Check for old 'action' field (migration)
      const oldRow = db.prepare('SELECT action FROM link_filter WHERE guild_id = ?').get(guildId);
      if (oldRow && oldRow.action) {
        actions = [oldRow.action];
      } else {
        actions = ['delete'];
      }
    }
    
    return {
      enabled: row.enabled === 1,
      actions: Array.isArray(actions) ? actions : ['delete'],
      whitelist: row.whitelist ? JSON.parse(row.whitelist) : [],
      allowedDomains: row.allowed_domains ? JSON.parse(row.allowed_domains) : []
    };
  },

  setLinkFilter(guildId, config) {
    const enabledInt = config.enabled ? 1 : 0;
    const whitelistJson = JSON.stringify(config.whitelist || []);
    const allowedDomainsJson = JSON.stringify(config.allowedDomains || []);
    const actionsJson = JSON.stringify(config.actions || (config.action ? [config.action] : ['delete']));
    db.prepare('INSERT OR REPLACE INTO link_filter (guild_id, enabled, actions, whitelist, allowed_domains) VALUES (?, ?, ?, ?, ?)')
      .run(guildId, enabledInt, actionsJson, whitelistJson, allowedDomainsJson);
  },

  // Crypto wallets
  getCryptoWallet(userId, currency) {
    const row = db.prepare('SELECT address, verified, verification_code, verification_message, verification_timestamp FROM crypto_wallets WHERE user_id = ? AND currency = ?').get(userId, currency.toUpperCase());
    return row ? {
      address: row.address,
      verified: row.verified === 1,
      verificationCode: row.verification_code,
      verificationMessage: row.verification_message,
      verificationTimestamp: row.verification_timestamp
    } : null;
  },

  setCryptoWallet(userId, currency, address, verified = false, verificationCode = null, verificationMessage = null, verificationTimestamp = null) {
    const verifiedInt = verified ? 1 : 0;
    db.prepare('INSERT OR REPLACE INTO crypto_wallets (user_id, currency, address, verified, verification_code, verification_message, verification_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, currency.toUpperCase(), address, verifiedInt, verificationCode, verificationMessage, verificationTimestamp);
  },

  setVerificationMessage(userId, currency, message, timestamp) {
    db.prepare('UPDATE crypto_wallets SET verification_message = ?, verification_timestamp = ? WHERE user_id = ? AND currency = ?')
      .run(message, timestamp, userId, currency.toUpperCase());
  },

  getVerificationMessage(userId, currency) {
    const row = db.prepare('SELECT verification_message, verification_timestamp FROM crypto_wallets WHERE user_id = ? AND currency = ?').get(userId, currency.toUpperCase());
    if (!row || !row.verification_message) return null;
    
    // Check if message is expired (24 hours)
    const MESSAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
    if (row.verification_timestamp && (Date.now() - row.verification_timestamp > MESSAGE_EXPIRY)) {
      return null; // Message expired
    }
    
    return {
      message: row.verification_message,
      timestamp: row.verification_timestamp
    };
  },

  removeCryptoWallet(userId, currency) {
    db.prepare('DELETE FROM crypto_wallets WHERE user_id = ? AND currency = ?').run(userId, currency.toUpperCase());
  },

  getAllCryptoWallets(userId) {
    const rows = db.prepare('SELECT currency, address, verified FROM crypto_wallets WHERE user_id = ?').all(userId);
    const result = {};
    rows.forEach(row => {
      result[row.currency] = {
        address: row.address,
        verified: row.verified === 1
      };
    });
    return result;
  },

  getAllUsersWithCrypto(currency = null) {
    if (currency) {
      const rows = db.prepare('SELECT user_id, address, verified FROM crypto_wallets WHERE currency = ?').all(currency.toUpperCase());
      return rows.map(row => ({
        userId: row.user_id,
        address: row.address,
        verified: row.verified === 1
      }));
    } else {
      const rows = db.prepare('SELECT DISTINCT user_id FROM crypto_wallets').all();
      return rows.map(row => row.user_id);
    }
  },

  // Verification nonces
  createVerificationNonce(userId, currency, address = null, expirationMinutes = 10) {
    const crypto = require('crypto');
    const nonce = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + (expirationMinutes * 60 * 1000);
    
    db.prepare(`
      INSERT INTO verification_nonces (nonce, user_id, currency, address, created_at, expires_at, used, verified)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `).run(nonce, userId, currency.toUpperCase(), address, now, expiresAt);
    
    return nonce;
  },

  getVerificationNonce(nonce) {
    const row = db.prepare('SELECT * FROM verification_nonces WHERE nonce = ?').get(nonce);
    if (!row) return null;
    
    return {
      nonce: row.nonce,
      userId: row.user_id,
      currency: row.currency,
      address: row.address,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      used: row.used === 1,
      verified: row.verified === 1
    };
  },

  markNonceAsUsed(nonce, verified = true) {
    db.prepare(`
      UPDATE verification_nonces 
      SET used = 1, verified = ?
      WHERE nonce = ?
    `).run(verified ? 1 : 0, nonce);
  },

  deleteExpiredNonces() {
    const now = Date.now();
    const deleted = db.prepare('DELETE FROM verification_nonces WHERE expires_at < ? OR (used = 1 AND verified = 1)').run(now);
    return deleted.changes;
  },

  cleanupExpiredNonces() {
    // Clean up expired or used nonces (run periodically)
    return this.deleteExpiredNonces();
  }
};

module.exports = {
  db,
  dbHelpers,
  initializeDatabase
};

