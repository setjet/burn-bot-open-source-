/*
 * reload — Bot owner only (BOT_OWNER_ID).
 *
 * Lightweight dev/ops ping: reacts with 🙈 if you're authorized. Does not hot-reload code.
 *
 * Usage:
 *   <prefix>reload
 */

// the illusion of productivity (real hot reload never shipped) 😭

const config = require('../../config');

module.exports = {
    name: 'reload',
    category: 'admin',
    async execute(message) {
      if (!config.botOwnerId || message.author.id !== config.botOwnerId) {
        return;
      }
      
      
      await message.react('🙈').catch(() => {});
    }
  };