# 🔥 burn Update Log

## ✨ New Features

### 📝 Logging System (`logs` / `log`)
<:arrows:1457808531678957784> **Track and monitor server activity with a comprehensive logging system!**

**Features:**
<:leese:1457834970486800567> Set a dedicated logging channel for all events
<:leese:1457834970486800567> Toggle specific log events on/off
<:leese:1457834970486800567> Log member joins, leaves, bans, kicks, timeouts
<:leese:1457834970486800567> Track message edits and deletions
<:leese:1457834970486800567> Monitor role and channel changes
<:tree:1457808523986731008> Beautiful embed logs with timestamps and user information

**Usage:**
\`\`\`
,logs channel #logs
,logs toggle member_join
,logs toggle message_delete
,logs view
,logs events
\`\`\`

---

### 🛡️ Raid Protection (`raidprotection` / `raid` / `rp`)
<:arrows:1457808531678957784> **Protect your server from raids with automatic detection and response!**

**Features:**
<:leese:1457834970486800567> Configurable member join threshold (default: 5 members)
<:leese:1457834970486800567> Customizable time window (default: 10 seconds)
<:leese:1457834970486800567> Automatic lockdown or ban when raid detected
<:leese:1457834970486800567> Whitelist trusted users to bypass protection
<:tree:1457808523986731008> Real-time monitoring of member joins

**Usage:**
\`\`\`
,raidprotection toggle on
,raidprotection threshold 5
,raidprotection window 10
,raidprotection action lockdown
,raidprotection whitelist @user
,raidprotection view
\`\`\`

**Actions:**
- `lockdown` - Locks all channels when raid detected
- `ban` - Automatically bans recent joiners

---

### 🔗 Link Filter (`linkfilter` / `lf` / `filterlinks`)
<:arrows:1457808531678957784> **Control link sharing in your server with advanced filtering!**

**Features:**
<:leese:1457834970486800567> Multiple actions: delete, warn, and timeout
<:leese:1457834970486800567> Allow specific domains (e.g., discord.gg, youtube.com)
<:leese:1457834970486800567> Whitelist users who can post links
<:leese:1457834970486800567> Server owner automatically excluded
<:tree:1457808523986731008> Combine multiple actions for stronger protection

**Usage:**
\`\`\`
,linkfilter toggle on
,linkfilter action add delete
,linkfilter action add warn
,linkfilter action add timeout
,linkfilter allow discord.gg
,linkfilter allow youtube.com
,linkfilter whitelist @user
,linkfilter view
\`\`\`

**Actions:**
- `delete` - Deletes messages with links
- `warn` - Deletes message and sends warning
- `timeout` - Deletes message and times out user for 1 minute

---

## 🎯 Quick Setup Guide

**1. Set up logging:**
\`\`\`
,logs channel #logs
,logs toggle member_join
,logs toggle member_leave
,logs toggle message_delete
\`\`\`

**2. Enable raid protection:**
\`\`\`
,raidprotection toggle on
,raidprotection threshold 5
,raidprotection action lockdown
\`\`\`

**3. Configure link filter:**
\`\`\`
,linkfilter toggle on
,linkfilter action add delete
,linkfilter allow discord.gg
\`\`\`

---

## 📋 Permissions Required

- **Logging:** Manage Guild
- **Raid Protection:** Administrator
- **Link Filter:** Manage Guild

---

## 🔧 Improvements

<:check:1457808518848581858> All new systems are fully persistent (settings saved to database)
<:check:1457808518848581858> Comprehensive error handling
<:check:1457808518848581858> Whitelist support for all protection systems
<:check:1457808518848581858> Server owner protection (excluded from filters)

---

**Need help?** Use \`,help\` to see all available commands!

