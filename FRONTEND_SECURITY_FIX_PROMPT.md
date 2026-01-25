# Frontend Security Fix: Discord User ID Handling

## Task
Fix the Discord user ID handling in the crypto wallet verification frontend to prevent security vulnerabilities. The backend now requires `discordUserId` to always be provided and validated.

## Current Issue
The verification link includes `discord_id` as a URL parameter, but the frontend might not be extracting it or sending it in the API request. This creates a security vulnerability.

## Required Changes

### 1. Extract discord_id from URL Query Parameters

**On the verification page (`/verify` or similar):**

```javascript
// Extract all required parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const discordId = urlParams.get('discord_id');
const nonce = urlParams.get('nonce');
const currency = urlParams.get('currency');

// Validate all required parameters exist
if (!discordId) {
  showError('Invalid verification link. Missing Discord user ID.');
  return;
}

if (!nonce) {
  showError('Invalid verification link. Missing verification token.');
  return;
}

if (!currency) {
  showError('Invalid verification link. Missing currency type.');
  return;
}
```

### 2. Always Include discordUserId in API Request

**When calling `/api/verify` endpoint:**

```javascript
async function verifyWallet(connectedAddress) {
  // Get discord_id from URL (already extracted above)
  const discordId = urlParams.get('discord_id');
  
  if (!discordId) {
    showError('Discord user ID is missing. Cannot verify wallet.');
    return;
  }
  
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nonce: nonce,                    // From URL
        address: connectedAddress,       // From wallet connection
        discordUserId: discordId,         // REQUIRED: From URL
        secret: process.env.NEXT_PUBLIC_VERIFICATION_API_SECRET
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      handleError(error);
      return;
    }
    
    const result = await response.json();
    showSuccess('Wallet verified successfully!');
    
  } catch (error) {
    showError('Failed to verify wallet. Please try again.');
    console.error('Verification error:', error);
  }
}
```

### 3. Validate Parameters on Page Load

**Add validation when the page loads:**

```javascript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const discordId = urlParams.get('discord_id');
  const nonce = urlParams.get('nonce');
  const currency = urlParams.get('currency');
  
  // Check all required parameters
  const missingParams = [];
  if (!discordId) missingParams.push('discord_id');
  if (!nonce) missingParams.push('nonce');
  if (!currency) missingParams.push('currency');
  
  if (missingParams.length > 0) {
    showError(
      `Invalid verification link. Missing parameters: ${missingParams.join(', ')}. ` +
      `Please generate a new verification link from Discord.`
    );
    // Optionally redirect or disable the verify button
    return;
  }
  
  // All parameters present, enable verification
}, []);
```

### 4. Error Handling for Missing discordUserId

**If the backend returns 400 error about missing Discord user ID:**

```javascript
async function handleError(error) {
  if (error.error === 'Discord user ID is required') {
    showError(
      'Discord user ID is missing from the verification link. ' +
      'Please generate a new verification link by running the command again in Discord.'
    );
  } else if (error.error === 'You are not authorized to verify this nonce') {
    showError(
      'You are not authorized to use this verification link. ' +
      'This link belongs to a different Discord user. ' +
      'Please generate your own verification link from Discord.'
    );
  } else {
    showError(error.message || error.error || 'An error occurred during verification.');
  }
}
```

## Complete Implementation Example

**For Next.js/React:**

```javascript
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [discordId, setDiscordId] = useState(null);
  const [nonce, setNonce] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Extract parameters from URL
    const discordIdParam = searchParams.get('discord_id');
    const nonceParam = searchParams.get('nonce');
    const currencyParam = searchParams.get('currency');
    
    // Validate all required parameters
    if (!discordIdParam || !nonceParam || !currencyParam) {
      setError('Invalid verification link. Missing required parameters.');
      return;
    }
    
    setDiscordId(discordIdParam);
    setNonce(nonceParam);
    setCurrency(currencyParam);
  }, [searchParams]);
  
  async function handleVerify(connectedAddress) {
    if (!discordId || !nonce) {
      setError('Missing required verification parameters.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nonce: nonce,
          address: connectedAddress,
          discordUserId: discordId,  // REQUIRED - from URL
          secret: process.env.NEXT_PUBLIC_VERIFICATION_API_SECRET
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'Discord user ID is required') {
          setError('Discord user ID is missing. Please generate a new verification link.');
        } else if (data.error === 'You are not authorized to verify this nonce') {
          setError('This verification link belongs to a different user.');
        } else {
          setError(data.message || data.error || 'Verification failed.');
        }
        return;
      }
      
      // Success
      setError(null);
      // Show success message or redirect
      
    } catch (err) {
      setError('Failed to verify wallet. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Rest of component...
}
```

## Security Requirements

### ✅ Must Do:
1. **Extract `discord_id` from URL query parameters** - Don't hardcode or skip it
2. **Validate it exists** - Show error if missing from URL
3. **Always include in API request** - Never omit `discordUserId` from request body
4. **Handle 400 errors** - Show user-friendly message if backend rejects missing ID
5. **Handle 403 errors** - Show message if user ID doesn't match nonce owner

### ❌ Don't Do:
- Don't skip `discordUserId` in the request
- Don't use a hardcoded or placeholder user ID
- Don't allow verification without `discord_id` in URL
- Don't ignore errors about missing Discord user ID

## Testing Checklist

After implementation, test:

- [ ] Page loads with valid URL parameters (discord_id, nonce, currency)
- [ ] Page shows error if `discord_id` is missing from URL
- [ ] API request includes `discordUserId` in body
- [ ] Verification succeeds with correct parameters
- [ ] Error message shown if backend returns 400 (missing ID)
- [ ] Error message shown if backend returns 403 (wrong user)
- [ ] User can't verify without `discord_id` in URL

## Backend API Response Reference

**Success (200):**
```json
{
  "success": true,
  "verified": true
}
```

**Missing discordUserId (400):**
```json
{
  "error": "Discord user ID is required",
  "message": "discordUserId must be provided in URL parameter (discord_id) or request body"
}
```

**Wrong user ID (403):**
```json
{
  "error": "You are not authorized to verify this nonce",
  "message": "This nonce belongs to a different Discord user"
}
```

## Summary

**Key Points:**
1. The verification URL contains `discord_id` as a query parameter
2. Extract it from the URL on page load
3. Always include it in the API request as `discordUserId`
4. Validate it exists before allowing verification
5. Handle errors gracefully with user-friendly messages

**Why This Matters:**
- Backend now requires `discordUserId` to prevent security vulnerabilities
- Missing or wrong user ID will cause verification to fail
- Users need clear error messages to understand what went wrong

**Implementation Priority:** 🔴 **HIGH** - This is a security fix that must be implemented.

