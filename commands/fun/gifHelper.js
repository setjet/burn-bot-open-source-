const fetch = require('node-fetch');
const { AttachmentBuilder } = require('discord.js');

const FETCH_TIMEOUT = 8000;
const MAX_SIZE = 8 * 1024 * 1024; // 8MB Discord limit

// giphy sometimes returns a polite html essay instead of a gif — this check exists because i saw it 😭

// GIF magic bytes — only attach real GIFs so we never send HTML/error pages
function isGifBuffer(buffer) {
  if (!buffer || buffer.length < 6) return false;
  const header = buffer.toString('ascii', 0, 6);
  return header === 'GIF87a' || header === 'GIF89a';
}

/**
 * Fetch a GIF from one of the given URLs and return an attachment.
 * Validates response is actually a GIF; tries next URL if not. Returns null if all fail.
 */
async function fetchGifAsAttachment(urls, filename = 'action.gif') {
  const list = Array.isArray(urls) ? urls : [urls];
  for (const url of list) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/gif,*/*'
        }
      });
      if (!res.ok) continue;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('gif') && !contentType.includes('octet-stream')) continue;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0 || buffer.length > MAX_SIZE) continue;
      if (!isGifBuffer(buffer)) continue;
      return new AttachmentBuilder(buffer, { name: filename });
    } catch (e) {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

module.exports = { fetchGifAsAttachment };
