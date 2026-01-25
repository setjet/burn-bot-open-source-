# Security Audit: Crypto Verification System

## 🔴 CRITICAL VULNERABILITIES

### 1. API Secret Exposed in Frontend ⚠️ **CRITICAL**

**Issue:**
The API secret is being sent from the frontend, which means it's exposed in client-side JavaScript code. Anyone can view the source code and extract the secret.

**Current Code:**
```javascript
// Frontend sends this:
body: JSON.stringify({
  secret: process.env.NEXT_PUBLIC_VERIFICATION_API_SECRET  // ❌ EXPOSED!
})
```

**Risk:**
- Anyone can view browser DevTools → Sources → Find the secret
- Attacker can use the secret to make API calls directly
- Can bypass all security checks by using the secret

**Solution:**
**Option A: Remove Secret from Frontend (Recommended)**
- Don't send the secret from the frontend at all
- Backend should validate requests based on other factors:
  - Nonce ownership (already checked)
  - Rate limiting (already implemented)
  - HTTPS origin validation
  - Or use a different authentication method

**Option B: Use Public/Private Key Pair**
- Frontend uses a public key (safe to expose)
- Backend validates with private key
- More complex but more secure

**Option C: Use JWT Tokens**
- Frontend gets a temporary token from backend
- Token expires quickly
- Token is tied to the nonce

**Recommended Fix:**
Remove the secret requirement from frontend requests. The backend already validates:
- Nonce ownership (discordUserId check)
- Rate limiting
- Nonce expiration

The secret check is redundant if these other validations are working.

---

### 2. CORS Too Permissive ⚠️ **HIGH**

**Issue:**
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

This allows **any website** to make requests to your API, which enables:
- Cross-site request forgery (CSRF) attacks
- Malicious websites calling your API
- Data exfiltration

**Risk:**
- Attacker creates a malicious website
- Website makes requests to your API using user's session
- Can verify wallets without user's knowledge

**Solution:**
```javascript
// Only allow your Vercel domain
const allowedOrigins = [
  'https://your-vercel-app.vercel.app',
  'https://your-custom-domain.com'
];

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
} else {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Origin not allowed' }));
  return;
}
```

**Or use environment variable:**
```javascript
const allowedOrigin = process.env.VERIFICATION_FRONTEND_URL || 'https://your-app.vercel.app';
res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
```

---

## 🟡 MEDIUM VULNERABILITIES

### 3. IP Address Spoofing ⚠️ **MEDIUM**

**Issue:**
```javascript
const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
```

IP addresses from headers can be spoofed. Attackers can:
- Set fake `X-Forwarded-For` headers
- Bypass IP-based rate limiting
- Make unlimited requests

**Risk:**
- Rate limiting by IP can be bypassed
- Attackers can make many requests from same IP

**Solution:**
- Don't rely solely on IP for rate limiting
- Use nonce-based and Discord ID-based rate limiting (already implemented)
- IP rate limiting is a secondary defense
- Consider using Railway's built-in IP tracking

**Note:** This is less critical because you have multiple rate limit layers (nonce, IP, Discord ID).

---

### 4. No Wallet Address Validation ⚠️ **MEDIUM**

**Issue:**
Wallet addresses are stored without validation. Invalid addresses can be stored.

**Current Code:**
```javascript
// No validation before storing
dbHelpers.setCryptoWallet(nonceData.userId, nonceData.currency, address, true);
```

**Risk:**
- Invalid addresses stored in database
- Could cause issues when displaying balances
- Potential for injection if address format is used elsewhere

**Solution:**
Add address validation based on currency:

```javascript
function validateAddress(address, currency) {
  switch (currency.toUpperCase()) {
    case 'ETH':
      // Ethereum address: 0x followed by 40 hex characters
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'SOL':
      // Solana address: Base58, 32-44 characters
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    case 'BTC':
    case 'LTC':
      // Bitcoin/Litecoin: Base58, various lengths
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
             /^bc1[a-z0-9]{39,59}$/.test(address); // Bech32
    default:
      return false;
  }
}

// In verification endpoint:
if (!validateAddress(address, nonceData.currency)) {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Invalid wallet address format',
    message: `The address does not match the expected format for ${nonceData.currency}`
  }));
  return;
}
```

---

### 5. Error Messages May Leak Information ⚠️ **LOW-MEDIUM**

**Issue:**
Some error messages might leak information about the system.

**Current Messages:**
- "Invalid or expired nonce" - Could help attackers enumerate valid nonces
- "Nonce already used" - Confirms nonce exists
- "This nonce belongs to a different Discord user" - Confirms nonce exists

**Risk:**
- Attackers can enumerate valid nonces
- Can determine if a nonce exists or not

**Solution:**
Use generic error messages for security-sensitive endpoints:

```javascript
// Instead of specific messages, use generic ones:
if (!nonceData) {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Verification failed',
    message: 'The verification link is invalid or has expired. Please generate a new one.'
  }));
  return;
}
```

**Note:** This is a trade-off between security and user experience. Current messages are helpful for debugging but could aid attackers.

---

## 🟢 LOW RISK / BEST PRACTICES

### 6. Nonce Generation ✅ **SECURE**

**Status:** ✅ Good
- Uses `crypto.randomBytes(32)` - cryptographically secure
- 64-character hex string - sufficient entropy
- No predictable patterns

### 7. SQL Injection ✅ **SECURE**

**Status:** ✅ Good
- Uses prepared statements (`db.prepare()`)
- Parameters are bound, not concatenated
- No SQL injection risk

### 8. Nonce Expiration ✅ **SECURE**

**Status:** ✅ Good
- Nonces expire after 10 minutes
- Expired nonces are rejected
- Prevents replay attacks

### 9. Nonce One-Time Use ✅ **SECURE**

**Status:** ✅ Good
- Nonces marked as used after verification
- Can't be reused
- Prevents replay attacks

### 10. Rate Limiting ✅ **SECURE**

**Status:** ✅ Good
- Multiple layers (nonce, IP, Discord ID)
- Exponential backoff
- Prevents brute force attacks

---

## 📋 Security Recommendations

### Priority 1: Fix Immediately 🔴

1. **Remove API Secret from Frontend**
   - Don't require secret in frontend requests
   - Backend validations are sufficient

2. **Restrict CORS**
   - Only allow your Vercel domain
   - Use environment variable for allowed origin

### Priority 2: Fix Soon 🟡

3. **Add Wallet Address Validation**
   - Validate format before storing
   - Prevent invalid addresses in database

4. **Improve Error Messages**
   - Use generic messages for security-sensitive errors
   - Don't leak information about nonce existence

### Priority 3: Consider 🟢

5. **IP Address Validation**
   - Don't rely solely on IP for rate limiting
   - Already have multiple layers, so this is lower priority

---

## 🔒 Security Checklist

### Backend
- [x] Nonce generation is cryptographically secure
- [x] SQL injection protection (prepared statements)
- [x] Rate limiting implemented
- [x] Nonce expiration enforced
- [x] Nonce one-time use enforced
- [x] Discord user ID validation
- [ ] **API secret should NOT be required from frontend** ⚠️
- [ ] **CORS should be restricted** ⚠️
- [ ] Wallet address validation
- [ ] Generic error messages

### Frontend
- [ ] Never expose API secret in client code
- [ ] Extract discord_id from URL
- [ ] Validate all URL parameters
- [ ] Handle errors gracefully
- [ ] Don't leak sensitive information in errors

---

## 🎯 Implementation Priority

1. **🔴 CRITICAL:** Remove API secret from frontend
2. **🔴 CRITICAL:** Restrict CORS to your domain only
3. **🟡 MEDIUM:** Add wallet address validation
4. **🟡 MEDIUM:** Improve error messages (optional)

---

## Summary

**Current Security Level:** 🟡 **MODERATE** (with critical issues)

**After Fixes:** 🟢 **SECURE**

**Main Issues:**
1. API secret exposed in frontend (CRITICAL)
2. CORS too permissive (HIGH)
3. No wallet address validation (MEDIUM)

**What's Already Secure:**
- Nonce generation and validation
- Rate limiting (multiple layers)
- SQL injection protection
- User authentication
- Nonce expiration and one-time use

