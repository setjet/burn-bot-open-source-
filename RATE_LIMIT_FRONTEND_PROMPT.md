# Rate Limit Error Handling - Frontend Implementation Prompt

## Task
Implement user-friendly rate limit error handling in the crypto wallet verification frontend. When the API returns a 429 (Too Many Requests) error, display clear messaging to the user explaining:
- What happened (they're rate limited)
- Why it happened (too many attempts)
- How long they need to wait
- What they can do

## API Error Response Format

When rate limited, the API returns HTTP 429 with this JSON structure:

```json
{
  "error": "Too many verification attempts for this nonce",
  "message": "Too many attempts. Please try again in 3599 seconds.",
  "retryAfter": 1000
}
```

**OR** for IP-based rate limiting:

```json
{
  "error": "Too many verification attempts from your IP",
  "retryAfter": 1000
}
```

## Implementation Requirements

### 1. Error Detection
- Catch HTTP 429 status codes from the `/api/verify` endpoint
- Parse the error response JSON to extract:
  - `error`: Error message
  - `message`: Human-readable message with time remaining (if present)
  - `retryAfter`: Exponential backoff delay in milliseconds (optional)

### 2. User-Friendly Display

**Show a clear error message that includes:**

1. **What happened:**
   - "Rate Limit Exceeded" or "Too Many Attempts"
   - Use a clear, non-technical explanation

2. **Why it happened:**
   - "You've made too many verification attempts"
   - "Rate limit: 5 attempts per nonce per hour"
   - "Rate limit: 10 attempts per IP per hour"

3. **How long to wait:**
   - Parse the `message` field to extract seconds remaining
   - Convert to human-readable format:
     - If < 60 seconds: "X seconds"
     - If < 3600 seconds: "X minutes" (round up)
     - If >= 3600 seconds: "X hours" (round up)
   - Example: "3599 seconds" → "1 hour"
   - Example: "1800 seconds" → "30 minutes"
   - Example: "300 seconds" → "5 minutes"

4. **What they can do:**
   - "Please wait [time] before trying again"
   - "Or generate a new verification link from Discord"
   - Optionally show a countdown timer

### 3. UI/UX Requirements

**Visual Design:**
- Use a warning/error color (yellow/orange/red)
- Include an icon (⚠️ or 🚫)
- Make it prominent but not alarming
- Use clear, readable typography

**Message Structure:**
```
⚠️ Rate Limit Exceeded

You've made too many verification attempts.

Rate limits:
• 5 attempts per verification link per hour
• 10 attempts per IP address per hour

Please wait 1 hour before trying again.

Or generate a new verification link by running:
,eth set (or ,sol set, ,btc set, etc.) in Discord
```

**Optional Enhancements:**
- Show a countdown timer (updates every second)
- Disable the "Verify" button until the rate limit expires
- Show a progress bar or visual indicator
- Provide a "Get New Link" button that explains how to get a fresh nonce

### 4. Error Message Parsing

**Extract time from message:**
```javascript
// Example: "Too many attempts. Please try again in 3599 seconds."
const messageMatch = error.message?.match(/try again in (\d+) seconds/i);
const secondsRemaining = messageMatch ? parseInt(messageMatch[1]) : 3600; // Default to 1 hour

// Convert to human-readable
function formatTimeRemaining(seconds) {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}
```

### 5. Different Rate Limit Types

Handle different error messages:

**Nonce-based rate limit:**
- Error: "Too many verification attempts for this nonce"
- Explanation: "You've used this verification link too many times"
- Solution: "Generate a new verification link from Discord"

**IP-based rate limit:**
- Error: "Too many verification attempts from your IP"
- Explanation: "Too many attempts from your network/IP address"
- Solution: "Wait 1 hour or use a different network"

**Discord ID-based rate limit:**
- Error: "Too many verification attempts for this Discord ID"
- Explanation: "You've made too many verification attempts"
- Solution: "Wait 1 hour before trying again"

### 6. Code Example Structure

```javascript
async function handleVerification(nonce, address, discordUserId) {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonce, address, discordUserId, secret: API_SECRET })
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited
        const errorData = await response.json();
        showRateLimitError(errorData);
        return;
      }
      // Handle other errors...
    }

    // Success handling...
  } catch (error) {
    // Network error handling...
  }
}

function showRateLimitError(errorData) {
  const { error, message, retryAfter } = errorData;
  
  // Parse time remaining
  const secondsRemaining = parseTimeFromMessage(message);
  const timeFormatted = formatTimeRemaining(secondsRemaining);
  
  // Determine rate limit type
  const rateLimitType = error.includes('nonce') ? 'nonce' : 
                       error.includes('IP') ? 'ip' : 'discord_id';
  
  // Show user-friendly message
  displayError({
    title: '⚠️ Rate Limit Exceeded',
    message: `You've made too many verification attempts.`,
    details: getRateLimitDetails(rateLimitType),
    timeRemaining: timeFormatted,
    solution: getSolution(rateLimitType)
  });
}
```

## Rate Limit Details

**Nonce-based (5 attempts/hour):**
- Most common for users
- Happens when using same verification link multiple times
- Solution: Get a new link from Discord

**IP-based (10 attempts/hour):**
- Happens when multiple users on same network/IP
- Solution: Wait 1 hour or use different network

**Discord ID-based (20 attempts/hour):**
- Happens when user tries to verify multiple wallets
- Solution: Wait 1 hour

## User Experience Goals

1. **Clear Communication:**
   - User should immediately understand what happened
   - No technical jargon
   - Clear next steps

2. **Helpful Guidance:**
   - Explain the rate limit rules
   - Show how long to wait
   - Provide alternative solutions

3. **Not Frustrating:**
   - Don't make users feel punished
   - Frame it as security protection
   - Offer clear path forward

4. **Accessible:**
   - Use clear language
   - Good contrast for readability
   - Consider screen readers

## Example User-Facing Messages

**Short version:**
```
⚠️ Too Many Attempts

You've exceeded the rate limit. Please wait 1 hour before trying again.

Or get a new verification link from Discord.
```

**Detailed version:**
```
⚠️ Rate Limit Exceeded

You've made too many verification attempts with this link.

Rate Limits:
• 5 attempts per verification link per hour
• 10 attempts per IP address per hour

Time Remaining: 45 minutes

What you can do:
1. Wait 45 minutes and try again
2. Generate a new verification link:
   Run ,eth set (or ,sol set, ,btc set) in Discord
```

## Testing Checklist

- [ ] 429 error is caught and handled
- [ ] Error message is parsed correctly
- [ ] Time remaining is calculated and displayed
- [ ] User-friendly explanation is shown
- [ ] Solution/next steps are provided
- [ ] UI is clear and not alarming
- [ ] Works on mobile and desktop
- [ ] Accessibility considerations met

## Notes

- Rate limit window is **1 hour** from first attempt
- After 1 hour, the limit resets automatically
- Users can get a new nonce anytime from Discord
- The `retryAfter` field is for exponential backoff, not the actual rate limit duration
- Always parse the `message` field for accurate time remaining

