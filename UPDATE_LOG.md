# 🔥 burn Update Log

## ✨ New Features

### 📝 Logging System (`logs` / `log`)
<:arrows:1457808531678957784> **Track and monitor server activity with a comprehensive logging system!**

**Features:**
<:leese:1457834970486800567> **Interactive dropdown menus** - Easy visual configuration interface
<:leese:1457834970486800567> Set a dedicated logging channel for all events
<:leese:1457834970486800567> Toggle specific log events on/off (15 total events)
<:leese:1457834970486800567> **All 15 events fully functional:**
  - Member: join, leave, ban, unban, kick, timeout, untimeout
  - Message: delete (with attachment support), edit
  - Role: create, delete, update
  - Channel: create, delete, update
<:leese:1457834970486800567> **Enhanced formatting** - Clean, professional embed logs
<:leese:1457834970486800567> **Attachment support** - Message delete logs preserve images, videos, and files
<:tree:1457808523986731008> Beautiful embed logs with timestamps, user information, and audit log data

**Usage:**
\`\`\`
,logs channel #logs
,logs toggle member_join
,logs toggle message_delete
,logs view
,logs events
\`\`\`

**Note:** Use the interactive dropdown interface by running `,logs` without any subcommands!

---

### 🛡️ Raid Protection (`raidprotection` / `raid` / `rp`)
<:arrows:1457808531678957784> **Protect your server from raids with automatic detection and response!**

**Features:**
<:leese:1457834970486800567> **Interactive dropdown menus** - Easy visual configuration interface
<:leese:1457834970486800567> Configurable member join threshold (2-20 members, default: 5)
<:leese:1457834970486800567> Customizable time window (5-60 seconds, default: 10 seconds)
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

**Note:** Use the interactive dropdown interface by running `,raidprotection` without any subcommands!

---

### 🔗 Link Filter (`linkfilter` / `lf` / `filterlinks`)
<:arrows:1457808531678957784> **Control link sharing in your server with advanced filtering!**

**Features:**
<:leese:1457834970486800567> **Interactive dropdown menus** - Easy visual configuration interface
<:leese:1457834970486800567> Multiple actions: delete, warn, and timeout (can combine all)
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
- `warn` - Deletes message and sends warning (auto-deletes after 5 seconds)
- `timeout` - Deletes message and times out user for 1 minute

**Note:** Use the interactive dropdown interface by running `,linkfilter` without any subcommands!

---

### 💰 Crypto Wallet Commands (`eth`, `sol`, `btc`, `ltc`, `cryptoleaderboard`)
<:arrows:1457808531678957784> **Manage and track cryptocurrency wallets directly in Discord!**

**Features:**
<:leese:1457834970486800567> **Multi-currency support** - Ethereum (ETH), Solana (SOL), Bitcoin (BTC), and Litecoin (LTC)
<:leese:1457834970486800567> **Automatic address validation** - Format validation + on-chain verification when setting wallets
<:leese:1457834970486800567> **Web-based verification** - Secure wallet ownership verification via Vercel web app
<:leese:1457834970486800567> **Real-time balance tracking** - Fetches live balances from blockchain APIs
<:leese:1457834970486800567> **USD conversion** - All balances converted to USD for fair leaderboard comparison
<:leese:1457834970486800567> **Smart leaderboard** - Shows only highest-value wallet per user, ranked by USD value
<:leese:1457834970486800567> **Library-based validation** - Uses ethers.js, @solana/web3.js, and bitcoinjs-lib for accurate address validation
<:leese:1457834970486800567> **Role restriction** - Only users with specific role can use crypto commands
<:tree:1457808523986731008> Comprehensive error handling with detailed validation messages

**Commands:**
\`\`\`
,eth set <address>     # Set Ethereum wallet
,eth                    # View your Ethereum wallet
,eth remove             # Remove Ethereum wallet
,sol set <address>      # Set Solana wallet
,btc set <address>      # Set Bitcoin wallet
,ltc set <address>      # Set Litecoin wallet
,cryptoleaderboard      # View crypto leaderboard
\`\`\`

**Validation Features:**
- **Format Validation:** Checks address format using proper crypto libraries
- **On-Chain Validation:** Verifies address exists on blockchain by fetching balance
- **Currency Detection:** Detects if wrong currency address is used (e.g., ETH address in SOL command)
- **Detailed Error Messages:** Provides specific feedback on what's wrong with addresses

**Verification System:**
- Web-based verification via Vercel app
- Nonce-based security (single-use, time-limited tokens)
- Message signing verification for wallet ownership
- Automatic verification link sent via DM

**Note:** Crypto commands are restricted to users with role ID `1458579256077586453`. Users without this role will be silently ignored.

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

**4. Set up crypto wallets:**
\`\`\`
,eth set 0xYourEthereumAddress
,sol set YourSolanaAddress
,btc set YourBitcoinAddress
,ltc set YourLitecoinAddress
,cryptoleaderboard
\`\`\`

---

## 📋 Permissions Required

- **Logging:** Manage Guild
- **Raid Protection:** Administrator
- **Link Filter:** Manage Guild
- **Crypto Commands:** Role ID `1458579256077586453` (restricted access)

---

## 🔧 Improvements

<:check:1457808518848581858> **Interactive dropdown interfaces** - All three commands now use visual dropdown menus for easier configuration
<:check:1457808518848581858> All new systems are fully persistent (settings saved to database)
<:check:1457808518848581858> Comprehensive error handling
<:check:1457808518848581858> Whitelist support for all protection systems
<:check:1457808518848581858> Server owner protection (excluded from filters)
<:check:1457808518848581858> **Enhanced log formatting** - All log embeds use clean, professional Discord formatting
<:check:1457808518848581858> **Attachment preservation** - Message delete logs include images, videos, and files with clickable links
<:check:1457808518848581858> **Complete event coverage** - All 15 logging events are now fully functional
<:check:1457808518848581858> **Crypto wallet system** - Full support for ETH, SOL, BTC, and LTC with automatic validation
<:check:1457808518848581858> **Web-based verification** - Secure wallet ownership verification via external Vercel app
<:check:1457808518848581858> **Smart address validation** - Library-based validation with currency detection and on-chain verification
<:check:1457808518848581858> **USD leaderboard** - Fair comparison by converting all balances to USD and showing only highest-value wallet

## 🐛 Bug Fixes

<:check:1457808518848581858> Fixed Discord component limit error (5-row limit) in logging system
<:check:1457808518848581858> Fixed missing logging events - Added 11 missing events (bans, kicks, timeouts, role/channel changes)
<:check:1457808518848581858> Fixed message delete logging - Now properly logs images, videos, and file attachments
<:check:1457808518848581858> Fixed view display - "Enabled Events" now shows count instead of cluttering with full list
<:check:1457808518848581858> Fixed link filter actions - All actions (delete, warn, timeout) now work correctly together
<:check:1457808518848581858> Improved event organization - Events grouped into category-based dropdowns for better UX
<:check:1457808518848581858> Fixed Etherscan API deprecation - Updated to V2 API with Ethplorer fallback
<:check:1457808518848581858> Fixed address validation - Enhanced validation with proper library checks and currency detection
<:check:1457808518848581858> Fixed balance fetching - Improved error handling for API responses and rate limiting

---

**Need help?** Use \`,help\` to see all available commands!

