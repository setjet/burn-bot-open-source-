# burn

Discord bot built with [discord.js](https://discord.js.org/) v14 and SQLite (`better-sqlite3`). Moderation, antinuke, fun commands, crypto wallet helpers, tickets, and more.

## Why this is on GitHub

I built this thing, ran it, tweaked it, and then hit the part of the project where you’re supposed to **promote** it and **grow** it and **explain** why strangers should add it to their server. I looked at that to-do list, sighed, and chose the path of least resistance: **open source it** and let the internet do whatever it wants with it.

So here you go. If you ship it harder than I did, you’re officially doing better than me. No royalties required—just don’t blame me if your verification flow does something weird at 3 a.m.

### A word on the crypto commands

The wallet stuff (`btc`, `eth`, `sol`, `ltc`, verification, nonces, “is this address even valid,” API quirks, rate limits, and the general feeling of talking to blockchains that do not care about your sleep schedule) ate **an unreasonable number of hours**. Like, *embarrassingly* long. If you read that code and think “this could be simpler,” you’re probably right—but you didn’t spend half your life convincing four different chains to return a number in a format you can parse. Enjoy the fruits of that labor.

### Embeds, chat formatting, and “does this look good in a channel?”

The **visual** side took ages too—not just what the bot *does*, but how it *reads* in Discord: embeds, field layout, colors, tiny lines of copy, custom emoji in strings, spacing, and the endless loop of “tweak it → screenshot → no still ugly → repeat.” If a reply looks half polished, that’s not accidental; that’s hours of arguing with markdown and character limits.

### Voicemaster (`commands/voicemaster/`)

I **never finished** this. It dragged on forever, I lost steam, got bored, and wandered off to something shinier. What’s in that folder is whatever state it was in when motivation clocked out—fork it, fix it, or treat it as a cautionary tale about scope creep.

### Other cool facts (trust me bro)

- **SQLite** means you’re one `bot.db` away from either glory or data-loss anxiety. Back it up if you care about your economy tables.
- **Antinuke** exists because someone, somewhere, will always try to speedrun your server settings. This bot tries to say “no.”
- If something breaks, the error might be Discord, the API, the network, cosmic rays, or you. Debug in that order.

## Requirements

- Node.js 18+ recommended
- A [Discord application / bot token](https://discord.com/developers/applications) with the intents your features need (e.g. **Message Content**, **Server Members**)

## Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in values:

   ```bash
   cp .env.example .env
   ```

   At minimum set **`DISCORD_TOKEN`**. Set **`BOT_OWNER_ID`** to your Discord user ID if you use owner-only admin commands (`blacklist`, `givecoins`, `jsk`, `ticket`, etc.). Other variables are optional; features that need a specific ID or URL no-op or show a setup message if unset.

3. Start the bot:

   ```bash
   npm start
   ```

## Configuration

All secrets and instance-specific IDs live in **`.env`** (never commit `.env`). See [`.env.example`](.env.example) for variable names and short descriptions.

**Security**

- Rotate your bot token (and any third-party API keys) if it was ever committed or shared.
- Set **`VERIFICATION_API_SECRET`** in production so the verification HTTP API does not use an ephemeral random secret on each process start.
- Restrict **`VERIFICATION_FRONTEND_URL`** to your real frontend origin instead of `*` when exposed to the internet.

## Verification API

The bot starts a small HTTP server (default port **`VERIFICATION_API_PORT`**, default `3001`) used by the optional wallet verification flow. Point your verification frontend at this service and configure CORS with **`VERIFICATION_FRONTEND_URL`**.

## License

Specify your license here (e.g. MIT) when you publish the repo.
