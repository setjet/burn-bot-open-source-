const fs = require('fs');
const path = require('path');
const { db, dbHelpers } = require('./db');

const dataFile = path.join(__dirname, 'storedata.json');

console.log('Starting migration from storedata.json to SQLite...');

if (!fs.existsSync(dataFile)) {
  console.log('No storedata.json found. Migration skipped.');
  process.exit(0);
}

try {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  
  // Migrate blacklisted users
  if (data.blacklistedUsers && Array.isArray(data.blacklistedUsers)) {
    console.log(`Migrating ${data.blacklistedUsers.length} blacklisted users...`);
    const insert = db.prepare('INSERT OR IGNORE INTO blacklisted_users (user_id) VALUES (?)');
    const insertMany = db.transaction((users) => {
      for (const userId of users) {
        insert.run(userId);
      }
    });
    insertMany(data.blacklistedUsers);
  }

  // Migrate blacklisted servers
  if (data.blacklistedServers && Array.isArray(data.blacklistedServers)) {
    console.log(`Migrating ${data.blacklistedServers.length} blacklisted servers...`);
    const insert = db.prepare('INSERT OR IGNORE INTO blacklisted_servers (server_id) VALUES (?)');
    const insertMany = db.transaction((servers) => {
      for (const serverId of servers) {
        insert.run(serverId);
      }
    });
    insertMany(data.blacklistedServers);
  }

  // Migrate economy balances
  if (data.economy && data.economy.balances) {
    const balances = Object.entries(data.economy.balances);
    console.log(`Migrating ${balances.length} economy balances...`);
    const insert = db.prepare('INSERT OR REPLACE INTO economy_balances (user_id, balance) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [userId, balance] of entries) {
        insert.run(userId, balance);
      }
    });
    insertMany(balances);
  }

  // Migrate economy cooldowns
  if (data.economy) {
    const dailyCooldowns = data.economy.dailyCooldowns || {};
    const workCooldowns = data.economy.workCooldowns || {};
    const allUserIds = new Set([...Object.keys(dailyCooldowns), ...Object.keys(workCooldowns)]);
    console.log(`Migrating ${allUserIds.size} economy cooldowns...`);
    const insert = db.prepare('INSERT OR REPLACE INTO economy_cooldowns (user_id, daily_cooldown, work_cooldown) VALUES (?, ?, ?)');
    const insertMany = db.transaction((userIds) => {
      for (const userId of userIds) {
        insert.run(userId, dailyCooldowns[userId] || null, workCooldowns[userId] || null);
      }
    });
    insertMany(Array.from(allUserIds));
  }

  // Migrate economy shop items
  if (data.economy && data.economy.shopItems) {
    const shopItems = Object.entries(data.economy.shopItems);
    console.log(`Migrating shop items for ${shopItems.length} servers...`);
    for (const [guildId, shopData] of shopItems) {
      if (shopData && shopData.items && Array.isArray(shopData.items)) {
        dbHelpers.setShopItems(guildId, shopData.items);
      }
    }
  }

  // Migrate server prefixes
  if (data.serverPrefixes) {
    const prefixes = Object.entries(data.serverPrefixes);
    console.log(`Migrating ${prefixes.length} server prefixes...`);
    const insert = db.prepare('INSERT OR REPLACE INTO server_prefixes (guild_id, prefix) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [guildId, prefix] of entries) {
        insert.run(guildId, prefix);
      }
    });
    insertMany(prefixes);
  }

  // Migrate forced nicknames
  if (data.forcedNicknames) {
    const nicknames = Object.entries(data.forcedNicknames);
    console.log(`Migrating forced nicknames for ${nicknames.length} servers...`);
    const insert = db.prepare('INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES (?, ?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [guildId, guildNicknames] of entries) {
        if (guildNicknames && typeof guildNicknames === 'object') {
          for (const [userId, nickname] of Object.entries(guildNicknames)) {
            insert.run(guildId, userId, nickname);
          }
        }
      }
    });
    insertMany(nicknames);
  }

  // Migrate filtered words
  if (data.filteredWords) {
    const words = Object.entries(data.filteredWords);
    console.log(`Migrating filtered words for ${words.length} servers...`);
    const insert = db.prepare('INSERT OR IGNORE INTO filtered_words (guild_id, word) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [guildId, guildWords] of entries) {
        if (Array.isArray(guildWords)) {
          for (const word of guildWords) {
            insert.run(guildId, word);
          }
        }
      }
    });
    insertMany(words);
  }

  // Migrate auto responses
  if (data.autoResponses) {
    const responses = Object.entries(data.autoResponses);
    console.log(`Migrating auto responses for ${responses.length} servers...`);
    const insert = db.prepare('INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response) VALUES (?, ?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [guildId, guildResponses] of entries) {
        if (guildResponses && typeof guildResponses === 'object') {
          for (const [trigger, response] of Object.entries(guildResponses)) {
            if (trigger && response !== undefined && response !== null) {
              insert.run(guildId, trigger, String(response));
            }
          }
        }
      }
    });
    insertMany(responses);
  }

  // Migrate birthdays
  if (data.birthdays) {
    const birthdays = Object.entries(data.birthdays);
    console.log(`Migrating ${birthdays.length} birthdays...`);
    const insert = db.prepare('INSERT OR REPLACE INTO birthdays (user_id, birthday) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [userId, birthday] of entries) {
        insert.run(userId, birthday);
      }
    });
    insertMany(birthdays);
  }

  // Migrate hardbanned users
  if (data.hardbannedUsers) {
    const hardbans = Object.entries(data.hardbannedUsers);
    console.log(`Migrating hardbanned users for ${hardbans.length} servers...`);
    const insert = db.prepare('INSERT OR IGNORE INTO hardbanned_users (guild_id, user_id) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [guildId, userIds] of entries) {
        if (Array.isArray(userIds)) {
          for (const userId of userIds) {
            insert.run(guildId, userId);
          }
        }
      }
    });
    insertMany(hardbans);
  }

  // Migrate slur counts
  if (data.slurCounts) {
    const slurCounts = Object.entries(data.slurCounts);
    console.log(`Migrating ${slurCounts.length} slur counts...`);
    const insert = db.prepare('INSERT OR REPLACE INTO slur_counts (user_id, count) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [userId, count] of entries) {
        insert.run(userId, count);
      }
    });
    insertMany(slurCounts);
  }

  // Migrate spam warnings
  if (data.spamWarnings) {
    const warnings = Object.entries(data.spamWarnings);
    console.log(`Migrating ${warnings.length} spam warnings...`);
    const insert = db.prepare('INSERT OR REPLACE INTO spam_warnings (user_id, warning_count) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [userId, count] of entries) {
        if (count > 0) {
          insert.run(userId, count);
        }
      }
    });
    insertMany(warnings);
  }

  // Migrate blacklist levels
  if (data.blacklistLevels) {
    const levels = Object.entries(data.blacklistLevels);
    console.log(`Migrating ${levels.length} blacklist levels...`);
    const insert = db.prepare('INSERT OR REPLACE INTO blacklist_levels (user_id, level) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [userId, level] of entries) {
        if (level > 0) {
          insert.run(userId, level);
        }
      }
    });
    insertMany(levels);
  }

  // Migrate blacklist expirations
  if (data.blacklistExpirations) {
    const expirations = Object.entries(data.blacklistExpirations);
    console.log(`Migrating ${expirations.length} blacklist expirations...`);
    const insert = db.prepare('INSERT OR REPLACE INTO blacklist_expirations (user_id, expiration) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [userId, expiration] of entries) {
        if (expiration) {
          insert.run(userId, expiration);
        }
      }
    });
    insertMany(expirations);
  }

  // Migrate antinuke configs
  if (data.antinuke) {
    const configs = Object.entries(data.antinuke);
    console.log(`Migrating ${configs.length} antinuke configs...`);
    for (const [guildId, config] of configs) {
      dbHelpers.setAntinukeConfig(guildId, config);
    }
  }

  console.log('Migration completed successfully!');
  console.log('Note: Your storedata.json file has been preserved as a backup.');
  console.log('You can delete it after verifying everything works correctly.');
  
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

