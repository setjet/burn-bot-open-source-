-- Database Export
-- Generated: 2026-01-05T03:00:42.057Z

-- Table: blacklisted_users
INSERT OR REPLACE INTO blacklisted_users (user_id) VALUES ('858372632478875668');

-- Table: economy_balances
INSERT OR REPLACE INTO economy_balances (user_id, balance) VALUES ('1448417272631918735', 1e+47);
INSERT OR REPLACE INTO economy_balances (user_id, balance) VALUES ('1331687851024191499', 1000000);

-- Table: economy_cooldowns
INSERT OR REPLACE INTO economy_cooldowns (user_id, daily_cooldown, work_cooldown) VALUES ('1448417272631918735', 1767555020713, 1767279748627);

-- Table: server_prefixes
INSERT OR REPLACE INTO server_prefixes (guild_id, prefix) VALUES ('1335213460786511954', ',');
INSERT OR REPLACE INTO server_prefixes (guild_id, prefix) VALUES ('1309231689955807273', ',');
INSERT OR REPLACE INTO server_prefixes (guild_id, prefix) VALUES ('1456037382762795199', ',');

-- Table: forced_nicknames
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('guildId1', 'userId1', 'nickname1');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('guildId1', 'userId2', 'nickname2');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('guildId2', 'userId3', 'nickname3');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('1359474259902332992', '758522527885951016', 'goodboy');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('1359474259902332992', '1318693972662554625', 'test');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('1359474259902332992', '1200643929826152491', 'test');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('1342130282270031973', '1304653006062620674', 'ski (not og)');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('1335213460786511954', '853971499622858752', 'ah');
INSERT OR REPLACE INTO forced_nicknames (guild_id, user_id, nickname) VALUES ('1356690604666650867', '1452241662590976101', 'nig');

-- Table: filtered_words
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('guildId1', 'word1');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('guildId1', 'word2');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('guildId2', 'word3');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1302348166057820291', 'add');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1302348166057820291', 'b1d');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1342130282270031973', 'nigger');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1359474259902332992', 'nigger');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1309231689955807273', 'rape');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1309231689955807273', 'nigger');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1328173729242415286', '(https?://)?(www.)?(discord.(gg|io|me|li)|discordapp.com/invite|discord.com/invite)/.+[a-z]');
INSERT OR REPLACE INTO filtered_words (guild_id, word) VALUES ('1328173729242415286', '#');

-- Table: auto_responses
INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response) VALUES ('guildId1', 'trigger1', '[object Object]');
INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response) VALUES ('guildId2', 'trigger2', '[object Object]');
INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response) VALUES ('1335213460786511954', 'pic', '[object Object]');
INSERT OR REPLACE INTO auto_responses (guild_id, trigger, response) VALUES ('1302348166057820291', 'scheme', '[object Object]');

-- Table: birthdays
INSERT OR REPLACE INTO birthdays (user_id, birthday) VALUES ('758522527885951016', '2007-12-01');
INSERT OR REPLACE INTO birthdays (user_id, birthday) VALUES ('userId1', '1999-01-01');
INSERT OR REPLACE INTO birthdays (user_id, birthday) VALUES ('userId2', '2000-12-31');
INSERT OR REPLACE INTO birthdays (user_id, birthday) VALUES ('1244645478260543599', '2002-04-12');

-- Table: hardbanned_users
INSERT OR REPLACE INTO hardbanned_users (guild_id, user_id) VALUES ('1335213460786511954', '1348738821411569694');
INSERT OR REPLACE INTO hardbanned_users (guild_id, user_id) VALUES ('1335213460786511954', '696452268005785720');

-- Table: slur_counts
INSERT OR REPLACE INTO slur_counts (user_id, count) VALUES ('1448417272631918735_nigger', 1);
INSERT OR REPLACE INTO slur_counts (user_id, count) VALUES ('1448417272631918735_nigga', 2);

-- Table: spam_warnings
INSERT OR REPLACE INTO spam_warnings (user_id, warning_count) VALUES ('1448417272631918735', 1);

-- Table: antinuke_configs
INSERT OR REPLACE INTO antinuke_configs (guild_id, config_data) VALUES ('1456037382762795199', '{"modules":{"botadd":{"enabled":true,"threshold":1,"punishment":"ban","command":false},"emoji":{"enabled":false,"threshold":3,"punishment":"ban","command":false},"channel":{"enabled":false,"threshold":3,"punishment":"ban","command":false}},"whitelist":[],"admins":[],"timeWindow":10000,"logChannel":"1457384692377452743","override":true}');
INSERT OR REPLACE INTO antinuke_configs (guild_id, config_data) VALUES ('1335213460786511954', '{"modules":{"kick":{"enabled":true,"threshold":3,"punishment":"stripstaff","command":true},"botadd":{"enabled":true,"threshold":1,"punishment":"warn","command":false}},"whitelist":[],"admins":[],"timeWindow":10000,"logChannel":null}');
INSERT OR REPLACE INTO antinuke_configs (guild_id, config_data) VALUES ('1356690604666650867', '{"modules":{"botadd":{"enabled":false,"threshold":1,"punishment":"ban","command":false},"emoji":{"enabled":false,"threshold":3,"punishment":"ban","command":false}},"whitelist":[],"admins":[],"timeWindow":10000,"logChannel":null,"override":false}');
INSERT OR REPLACE INTO antinuke_configs (guild_id, config_data) VALUES ('1309231689955807273', '{"modules":{"kick":{"enabled":true,"threshold":3,"punishment":"stripstaff","command":true},"botadd":{"enabled":true,"threshold":1,"punishment":"stripstaff","command":false},"channel":{"enabled":true,"threshold":3,"punishment":"stripstaff","command":false}},"whitelist":["408785106942164992"],"admins":[],"timeWindow":10000,"logChannel":"1361982976749207552","override":true}');

