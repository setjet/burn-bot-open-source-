# burn Bot - Complete Command Documentation

Make the correct categories for them and do the rest accordingly 

## Command Structure

All commands follow this format:
- **Name**: Primary command name
- **Aliases**: Alternative names for the command
- **Category**: Command category (moderation, utilities, economy, antinuke, admin, fun)
- **Parameters**: Required and optional parameters
- **Permissions**: Required permissions to use the command
- **Description**: What the command does

---

## Moderation Commands

### `ban` / `b`
**Category**: moderation  
**Description**: Bans a user from the server  
**Permissions**: Ban Members  
**Parameters**:
- `<user>` (required) - User to ban (mention, user ID, username, or display name)
- `(reason)` (optional) - Reason for the ban

**Usage**: `,ban @user reason` or `,ban 123456789012345678 spamming`

---

### `kick` / `k`
**Category**: moderation  
**Description**: Kicks a user from the server  
**Permissions**: Kick Members  
**Parameters**:
- `<user>` (required) - User to kick (mention, user ID, username, or display name)
- `(reason)` (optional) - Reason for the kick

**Usage**: `,kick @user reason` or `,kick 123456789012345678 spamming`

---

### `timeout` / `to`
**Category**: moderation  
**Description**: Times out a user in the server  
**Permissions**: Moderate Members  
**Parameters**:
- `<user>` (required) - User to timeout (mention, user ID, username, or display name)
- `(reason)` (optional) - Reason for the timeout

**Usage**: `,timeout @user reason` or `,timeout 123456789012345678 spamming`

---

### `untimeout` / `uto` / `ut`
**Category**: moderation  
**Description**: Removes a timeout from a user  
**Permissions**: Moderate Members  
**Parameters**:
- `<user>` (required) - User to untimeout (mention, user ID, username, or display name)

**Usage**: `,untimeout @user` or `,untimeout 123456789012345678`

---

### `unban` / `ub`
**Category**: moderation  
**Description**: Unbans a user from the server  
**Permissions**: Ban Members  
**Parameters**:
- `<user>` (required) - User to unban (user ID or username#discriminator)

**Usage**: `,unban 123456789012345678` or `,unban username#1234`

---

### `hardban` / `hb`
**Category**: moderation  
**Description**: Permanently bans a user from the server  
**Permissions**: Ban Members  
**Parameters**:
- `<user>` (required) - User to hardban (mention, user ID, username, or display name)
- `(reason)` (optional) - Reason for the hardban

**Usage**: `,hardban @user reason`

---

### `hardbanlist` / `hbl`
**Category**: moderation  
**Description**: Lists all hardbanned users  
**Permissions**: Ban Members  
**Parameters**: None

**Usage**: `,hardbanlist`

---

### `purge` / `c`
**Category**: moderation  
**Description**: Delete messages from a channel  
**Permissions**: Manage Messages  
**Parameters**:
- `<amount>` - Delete X messages
- `<user> <amount>` - Delete X messages from a specific user
- `contains <word>` - Delete messages containing a word
- `images` - Delete messages with images
- `emojis` - Delete messages with emojis

**Usage**: 
- `,purge 10` - Delete 10 messages
- `,purge @user 10` - Delete 10 messages from user
- `,purge contains word` - Delete messages containing "word"
- `,purge images` - Delete messages with images
- `,purge emojis` - Delete messages with emojis

---

### `botclear` / `bc`
**Category**: moderation  
**Description**: Clear messages from bots  
**Permissions**: Manage Messages  
**Parameters**: None

**Usage**: `,botclear`

---

### `stripstaff` / `ss`
**Category**: moderation  
**Description**: Remove all staff roles from a user  
**Permissions**: Manage Roles  
**Parameters**:
- `<user>` (required) - User to strip staff roles from

**Usage**: `,stripstaff @user`

---

### `forcenickname` / `fn`
**Category**: moderation  
**Description**: Force a nickname on a user  
**Permissions**: Manage Nicknames  
**Parameters**:
- `<user>` (required) - User to force nickname on
- `<nickname>` (required) - Nickname to set

**Usage**: `,forcenickname @user NewNickname`

---

### `lock`
**Category**: moderation  
**Description**: Lock a channel  
**Permissions**: Manage Channels  
**Parameters**:
- `(channel)` (optional) - Channel to lock (defaults to current channel)

**Usage**: `,lock` or `,lock #channel`

---

### `unlock`
**Category**: moderation  
**Description**: Unlock a channel  
**Permissions**: Manage Channels  
**Parameters**:
- `(channel)` (optional) - Channel to unlock (defaults to current channel)

**Usage**: `,unlock` or `,unlock #channel`

---

### `hide`
**Category**: moderation  
**Description**: Hide a channel  
**Permissions**: Manage Channels  
**Parameters**:
- `(channel)` (optional) - Channel to hide (defaults to current channel)

**Usage**: `,hide` or `,hide #channel`

---

### `unhide`
**Category**: moderation  
**Description**: Unhide a channel  
**Permissions**: Manage Channels  
**Parameters**:
- `(channel)` (optional) - Channel to unhide (defaults to current channel)

**Usage**: `,unhide` or `,unhide #channel`

---

### `slowmode`
**Category**: moderation  
**Description**: Set slowmode for a channel  
**Permissions**: Manage Channels  
**Parameters**:
- `<seconds>` (required) - Slowmode delay in seconds (0-21600)

**Usage**: `,slowmode 5` or `,slowmode 0` (to disable)

---

### `role`
**Category**: moderation  
**Description**: Add or remove a role from a user  
**Permissions**: Manage Roles  
**Parameters**:
- `<user>` (required) - User to modify
- `<role>` (required) - Role to add/remove (mention or role name)

**Usage**: `,role @user @role` or `,role @user RoleName`

---

### `nuke`
**Category**: moderation  
**Description**: Nuke (delete and recreate) a channel  
**Permissions**: Manage Channels  
**Parameters**: None

**Usage**: `,nuke`

---

### `nukeserver`
**Category**: moderation  
**Description**: Nuke the entire server (delete all channels and roles)  
**Permissions**: Administrator  
**Parameters**: None

**Usage**: `,nukeserver`

---

### `destroy`
**Category**: moderation  
**Description**: Destroy server (extreme action)  
**Permissions**: Administrator  
**Parameters**: None

**Usage**: `,destroy`

---

### `filter`
**Category**: moderation  
**Description**: Configure word filter  
**Permissions**: Manage Guild  
**Parameters**:
- `add <word>` - Add a word to filter
- `remove <word>` - Remove a word from filter
- `list` - List all filtered words
- `toggle` - Toggle filter on/off

**Usage**: 
- `,filter add word`
- `,filter remove word`
- `,filter list`
- `,filter toggle`

---

### `autorespond`
**Category**: moderation  
**Description**: Configure auto-responses  
**Permissions**: Manage Guild  
**Parameters**:
- `add <trigger> <response>` - Add an auto-response
- `remove <trigger>` - Remove an auto-response
- `list` - List all auto-responses
- `toggle` - Toggle auto-responses on/off

**Usage**: 
- `,autorespond add hello Hi there!`
- `,autorespond remove hello`
- `,autorespond list`
- `,autorespond toggle`

---

### `autorole`
**Category**: moderation  
**Description**: Configure auto-role assignment  
**Permissions**: Manage Roles  
**Parameters**:
- `add <role>` - Add a role to auto-assign
- `remove <role>` - Remove a role from auto-assign
- `list` - List all auto-roles
- `toggle` - Toggle auto-role on/off

**Usage**: 
- `,autorole add @role`
- `,autorole remove @role`
- `,autorole list`
- `,autorole toggle`

---

### `alias`
**Category**: moderation  
**Description**: Create command aliases  
**Permissions**: Manage Guild  
**Parameters**:
- `add <alias> <command>` - Add an alias
- `remove <alias>` - Remove an alias
- `list` - List all aliases

**Usage**: 
- `,alias add kickuser kick`
- `,alias remove kickuser`
- `,alias list`

---

### `dm`
**Category**: moderation  
**Description**: Manage the server's DM messages  
**Permissions**: Manage Guild  
**Parameters**:
- `set <message>` - Set the DM message
- `toggle` / `on` / `off` - Enable/disable DM messages
- `view` - View current settings
- `remove` - Remove DM configuration

**Usage**: 
- `,dm set Welcome to our server!`
- `,dm toggle`
- `,dm view`
- `,dm remove`

---

### `logs` / `log`
**Category**: moderation  
**Description**: Manage server logging system  
**Permissions**: Manage Guild  
**Parameters**:
- `channel <#channel>` - Set the logging channel
- `toggle` / `on` / `off` - Enable/disable entire logging system
- `toggle <event>` - Toggle specific log event
- `view` - View current logging settings
- `events` - List all available log events
- `remove` - Remove logging configuration

**Available Events**:
- `member_join`, `member_leave`, `member_ban`, `member_unban`, `member_kick`, `member_timeout`, `member_untimeout`
- `message_delete`, `message_edit`
- `role_create`, `role_delete`, `role_update`
- `channel_create`, `channel_delete`, `channel_update`

**Usage**: 
- `,logs channel #logs`
- `,logs toggle`
- `,logs toggle member_join`
- `,logs view`
- `,logs events`

---

### `raidprotection` / `raid` / `rp`
**Category**: moderation  
**Description**: Configure raid protection settings  
**Permissions**: Administrator  
**Parameters**:
- `toggle` / `on` / `off` - Enable/disable raid protection
- `threshold <number>` - Set member join threshold (default: 5)
- `window <seconds>` - Set time window in seconds (default: 10)
- `action <lockdown|ban>` - Set action when raid detected
- `whitelist <user>` - Add user to whitelist
- `whitelist remove <user>` - Remove user from whitelist
- `view` - View current settings
- `remove` - Remove raid protection configuration

**Usage**: 
- `,raidprotection toggle on`
- `,raidprotection threshold 5`
- `,raidprotection window 10`
- `,raidprotection action lockdown`
- `,raidprotection whitelist @user`
- `,raidprotection view`

---

### `linkfilter` / `lf` / `filterlinks`
**Category**: moderation  
**Description**: Configure link filtering settings  
**Permissions**: Manage Guild  
**Parameters**:
- `toggle` / `on` / `off` - Enable/disable link filter
- `action add <delete|warn|timeout>` - Add an action
- `action remove <delete|warn|timeout>` - Remove an action
- `allow <domain>` - Add allowed domain
- `remove <domain>` - Remove allowed domain
- `whitelist <user>` - Add/remove user from whitelist
- `whitelist remove <user>` - Remove user from whitelist
- `view` - View current settings
- `remove` - Remove link filter configuration

**Usage**: 
- `,linkfilter toggle on`
- `,linkfilter action add delete`
- `,linkfilter action add warn`
- `,linkfilter allow discord.gg`
- `,linkfilter whitelist @user`
- `,linkfilter view`

---

## Economy Commands

### `balance` / `bal` / `money` / `wallet`
**Category**: utilities  
**Description**: Check your or another user's balance  
**Permissions**: None  
**Parameters**:
- `(user)` (optional) - User to check balance of (defaults to yourself)

**Usage**: `,balance` or `,balance @user`

---

### `work` / `job`
**Category**: utilities  
**Description**: Work to earn money (1 hour cooldown)  
**Permissions**: None  
**Parameters**: None

**Usage**: `,work`

---

### `daily`
**Category**: utilities  
**Description**: Claim daily reward  
**Permissions**: None  
**Parameters**: None

**Usage**: `,daily`

---

### `pay` / `transfer` / `give`
**Category**: utilities  
**Description**: Send money to another user  
**Permissions**: None  
**Parameters**:
- `<user>` (required) - User to send money to
- `<amount>` (required) - Amount to send

**Usage**: `,pay @user 100` or `,pay 123456789012345678 100`

---

### `coinflip` / `cf`
**Category**: utilities  
**Description**: Flip a coin to gamble money  
**Permissions**: None  
**Parameters**:
- `<amount>` (required) - Amount to bet
- `<heads|tails>` (required) - Your guess

**Usage**: `,coinflip 100 heads` or `,coinflip 50 tails`

---

### `slots`
**Category**: utilities  
**Description**: Play slots to gamble money  
**Permissions**: None  
**Parameters**:
- `<amount>` (required) - Amount to bet

**Usage**: `,slots 100`

---

### `leaderboard` / `lb` / `rich` / `top`
**Category**: utilities  
**Description**: View the richest users  
**Permissions**: None  
**Parameters**: None

**Usage**: `,leaderboard`

---

## Utilities Commands

### `help` / `h`
**Category**: miscellaneous  
**Description**: View all available commands  
**Permissions**: None  
**Parameters**: None

**Usage**: `,help`

---

### `ping` / `p`
**Category**: utilities  
**Description**: Check bot latency  
**Permissions**: None  
**Parameters**: None

**Usage**: `,ping`

---

### `userinfo` / `ui` / `whois`
**Category**: utilities  
**Description**: View information about a user  
**Permissions**: None  
**Parameters**:
- `(user)` (optional) - User to view info of (defaults to yourself)

**Usage**: `,userinfo` or `,userinfo @user`

---

### `serverinfo` / `si`
**Category**: utilities  
**Description**: View information about the server  
**Permissions**: None  
**Parameters**: None

**Usage**: `,serverinfo`

---

### `botinformation` / `botinfo` / `bi`
**Category**: utilities  
**Description**: View information about the bot  
**Permissions**: None  
**Parameters**: None

**Usage**: `,botinformation`

---

### `avatar` / `av`
**Category**: utilities  
**Description**: View a user's avatar  
**Permissions**: None  
**Parameters**:
- `(user)` (optional) - User to view avatar of (defaults to yourself)

**Usage**: `,avatar` or `,avatar @user`

---

### `banner`
**Category**: utilities  
**Description**: View a user's banner  
**Permissions**: None  
**Parameters**:
- `(user)` (optional) - User to view banner of (defaults to yourself)

**Usage**: `,banner` or `,banner @user`

---

### `roles`
**Category**: utilities  
**Description**: List all server roles  
**Permissions**: None  
**Parameters**: None

**Usage**: `,roles`

---

### `roleinfo` / `ri`
**Category**: utilities  
**Description**: View information about a role  
**Permissions**: None  
**Parameters**:
- `<role>` (required) - Role to view info of

**Usage**: `,roleinfo @role` or `,roleinfo RoleName`

---

### `inrole` / `ir`
**Category**: utilities  
**Description**: List users with a specific role  
**Permissions**: None  
**Parameters**:
- `<role>` (required) - Role to check

**Usage**: `,inrole @role` or `,inrole RoleName`

---

### `snipe`
**Category**: utilities  
**Description**: View the last deleted message in the channel  
**Permissions**: None  
**Parameters**: None

**Usage**: `,snipe`

---

### `editsnipe` / `es`
**Category**: utilities  
**Description**: View the last edited message in the channel  
**Permissions**: None  
**Parameters**: None

**Usage**: `,editsnipe`

---

### `clearsnipe` / `cs`
**Category**: utilities  
**Description**: Clear snipe data for the channel  
**Permissions**: Manage Messages  
**Parameters**: None

**Usage**: `,clearsnipe`

---

### `emojis` / `emojilist`
**Category**: utilities  
**Description**: List all server emojis  
**Permissions**: None  
**Parameters**: None

**Usage**: `,emojis`

---

### `stickers`
**Category**: utilities  
**Description**: List all server stickers  
**Permissions**: None  
**Parameters**: None

**Usage**: `,stickers`

---

### `image` / `img`
**Category**: utilities  
**Description**: Generate or manipulate images  
**Permissions**: None  
**Parameters**: Varies by subcommand

**Usage**: `,image <subcommand>`

---

### `enlarge` / `e`
**Category**: utilities  
**Description**: Enlarge an emoji  
**Permissions**: None  
**Parameters**:
- `<emoji>` (required) - Emoji to enlarge

**Usage**: `,enlarge :emoji:` or `,enlarge <:emoji:123456789>`

---

### `togif`
**Category**: utilities  
**Description**: Convert emoji to GIF  
**Permissions**: None  
**Parameters**:
- `<emoji>` (required) - Emoji to convert

**Usage**: `,togif :emoji:`

---

### `urban` / `ud`
**Category**: utilities  
**Description**: Search Urban Dictionary  
**Permissions**: None  
**Parameters**:
- `<term>` (required) - Term to search

**Usage**: `,urban word`

---

### `mc` / `minecraft`
**Category**: utilities  
**Description**: Get Minecraft server information  
**Permissions**: None  
**Parameters**:
- `<server>` (required) - Minecraft server IP or domain

**Usage**: `,mc play.example.com`

---

### `timezone` / `tz`
**Category**: utilities  
**Description**: Set or view your timezone  
**Permissions**: None  
**Parameters**:
- `set <timezone>` - Set your timezone
- `view` - View your timezone

**Usage**: 
- `,timezone set America/New_York`
- `,timezone view`

---

### `bday` / `birthday`
**Category**: utilities  
**Description**: Set or view your birthday  
**Permissions**: None  
**Parameters**:
- `set <date>` - Set your birthday (MM/DD format)
- `view` - View your birthday
- `view <user>` - View another user's birthday

**Usage**: 
- `,bday set 12/25`
- `,bday view`
- `,bday view @user`

---

### `prefix`
**Category**: utilities  
**Description**: View or change the bot prefix  
**Permissions**: Manage Guild  
**Parameters**:
- `(new_prefix)` (optional) - New prefix to set

**Usage**: `,prefix` or `,prefix !`

---

## Antinuke Commands

### `antinuke` / `an`
**Category**: antinuke  
**Description**: Configure antinuke protection system  
**Permissions**: Administrator  
**Parameters**: Interactive menu system with subcommands

**Modules**:
- Ban Protection
- Kick Protection
- Role Protection
- Channel Protection
- Emoji Protection
- Webhook Protection
- Vanity URL Protection
- Bot Add Protection

**Settings**:
- Enable/Disable modules
- Set thresholds (1-6)
- Set actions (ban, kick, stripstaff)
- Enable/Disable command tracking

**Usage**: `,antinuke` (opens interactive menu)

---

### `antinukeadmin` / `anadmin`
**Category**: antinuke  
**Description**: Add/remove antinuke admins  
**Permissions**: Administrator  
**Parameters**:
- `add <user>` - Add user as antinuke admin
- `remove <user>` - Remove user from antinuke admins
- `list` - List all antinuke admins

**Usage**: 
- `,antinukeadmin add @user`
- `,antinukeadmin remove @user`
- `,antinukeadmin list`

---

### `antinukeadmins` / `anadmins`
**Category**: antinuke  
**Description**: List all antinuke admins  
**Permissions**: Administrator  
**Parameters**: None

**Usage**: `,antinukeadmins`

---

### `antinukewhitelist` / `anwhitelist` / `anwl`
**Category**: antinuke  
**Description**: Add user to antinuke whitelist  
**Permissions**: Administrator  
**Parameters**:
- `<user>` (required) - User to whitelist

**Usage**: `,antinukewhitelist @user`

---

### `antinukeunwhitelist` / `anunwhitelist` / `anunwl`
**Category**: antinuke  
**Description**: Remove user from antinuke whitelist  
**Permissions**: Administrator  
**Parameters**:
- `<user>` (required) - User to unwhitelist

**Usage**: `,antinukeunwhitelist @user`

---

### `antinukeunadmin` / `anunadmin`
**Category**: antinuke  
**Description**: Remove user from antinuke admins  
**Permissions**: Administrator  
**Parameters**:
- `<user>` (required) - User to remove from admins

**Usage**: `,antinukeunadmin @user`

---

### `antinukelog` / `anlog`
**Category**: antinuke  
**Description**: Set antinuke log channel  
**Permissions**: Administrator  
**Parameters**:
- `<#channel>` (required) - Channel to send antinuke logs to

**Usage**: `,antinukelog #channel`

---

## Fun Commands

### `nword` / `nw`
**Category**: fun  
**Description**: Fun command  
**Permissions**: None  
**Parameters**: None

**Usage**: `,nword`

---

## Parameter Types

### User Parameters
Users can be specified as:
- **Mention**: `@username`
- **User ID**: `123456789012345678`
- **Username**: `username` (searches in server)
- **Display Name**: `DisplayName` (searches in server)
- **Tag**: `username#1234`

### Role Parameters
Roles can be specified as:
- **Mention**: `@rolename`
- **Role Name**: `RoleName` (case-insensitive)

### Channel Parameters
Channels can be specified as:
- **Mention**: `#channelname`
- **Channel ID**: `123456789012345678`
- **Channel Name**: `channel-name` (searches in server)

### Time Parameters
Time can be specified as:
- **Seconds**: `60` (60 seconds)
- **Minutes**: `5m` (5 minutes)
- **Hours**: `2h` (2 hours)
- **Days**: `1d` (1 day)
- **Weeks**: `1w` (1 week)

---

## Permission Requirements

### Common Permissions
- **Ban Members**: Required for ban, unban, hardban commands
- **Kick Members**: Required for kick command
- **Moderate Members**: Required for timeout, untimeout commands
- **Manage Messages**: Required for purge, botclear, clearsnipe commands
- **Manage Roles**: Required for role, stripstaff, autorole commands
- **Manage Channels**: Required for lock, unlock, hide, unhide, slowmode, nuke commands
- **Manage Guild**: Required for filter, autorespond, alias, dm, logs, linkfilter commands
- **Administrator**: Required for raidprotection, antinuke, nukeserver, destroy commands

### Special Permissions
- **Authorized User Only**: Some admin commands require specific authorized user ID (not documented in public commands)

---

## Notes

- All commands use the default prefix `,` unless changed with the `prefix` command
- Commands are case-insensitive
- Parameters in `()` are optional, parameters in `<>` are required
- Multiple actions can be combined for link filter (e.g., delete + warn + timeout)
- Antinuke system uses interactive menus for configuration
- Economy commands have cooldowns (work: 1 hour, daily: 24 hours)
- Some commands have rate limiting to prevent abuse

---

## Command Categories Summary

1. **Moderation** (27 commands): Server management, user moderation, channel control
2. **Utilities** (25 commands): Information, utility functions, server tools
3. **Economy** (7 commands): Money system, gambling, leaderboards
4. **Antinuke** (7 commands): Server protection system
5. **Fun** (1 command): Entertainment commands

**Total Commands**: 67+ public commands with multiple aliases

