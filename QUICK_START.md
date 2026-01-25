# ⚡ Quick Start - Railway Deployment (30 minutes)

## What You Need to Do (Right Now)

### Step 1️⃣: Generate API Secret (2 min)

Run this in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

✅ **Copy this value and save it somewhere safe** - you'll need it twice.

---

### Step 2️⃣: Find Your Railway Domain (2 min)

1. Go to [railway.app](https://railway.app)
2. Click your project (burn)
3. Click your bot service
4. Click **Settings** tab
5. Find **Networking** section
6. Look for **Public URL** 

**Example:**
```
https://burn-production.up.railway.app
```

✅ **Copy this URL** - you'll need it next.

---

### Step 3️⃣: Set Railway Environment Variables (5 min)

1. Still in Railway service settings
2. Click **Variables** tab
3. Find the blue **+ New Variable** button
4. Add these variables:

| Key | Value |
|-----|-------|
| `VERIFICATION_API_PORT` | `3001` |
| `VERIFICATION_API_SECRET` | `<paste-from-step-1>` |

✅ **Make sure existing variables stay:**
- `DISCORD_TOKEN` (don't touch)
- `RAILWAY_VOLUME_MOUNT_PATH` (auto-set)

---

### Step 4️⃣: Set Vercel Environment Variables (5 min)

1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Click **Settings** tab
4. Click **Environment Variables**
5. Add these variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_VERIFICATION_API_URL` | `<paste-from-step-2>` |
| `VERIFICATION_API_SECRET` | `<paste-from-step-1>` |

✅ **These must match Railway exactly!**

---

### Step 5️⃣: Deploy Code to Railway (5 min)

Run these commands in PowerShell in your project directory:

```powershell
git add db.js index.js

git commit -m "security: add rate limiting and user authentication"

git push
```

✅ **Railway automatically redeploys!** Wait 2-3 minutes.

---

### Step 6️⃣: Verify HTTPS Works (3 min)

**Option A: Test in Browser (Easiest)**
1. Open your browser
2. Go to: `https://your-railway-domain.up.railway.app/api/nonce?nonce=test`
3. Replace `your-railway-domain` with your actual domain from Step 2

**Expected response:**
```json
{"error":"Nonce not found"}
```

✅ **Perfect! This means HTTPS is working!** The error is expected because `test` isn't a real nonce.

**Option B: Test in PowerShell**
```powershell
try {
    $response = Invoke-WebRequest -Uri "https://your-railway-domain.up.railway.app/api/nonce?nonce=test" -Method Get
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content: $($response.Content)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode" -ForegroundColor Yellow
    Write-Host "Content: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}
```

**Expected output:**
- Status: `400` (Bad Request)
- Content: `{"error":"Nonce not found"}`

✅ **Great! HTTPS is working!** The error is expected because `test` isn't a real nonce.

**Note:** Both responses (JSON error or HTTP 400) are correct! The important thing is:
- ✅ Connection works (not "connection refused")
- ✅ Server responds (not 404 or 500)
- ✅ URL uses HTTPS (not HTTP)

---

### Step 7️⃣: Check Railway Logs (2 min)

1. Go back to Railway dashboard
2. Select your bot service
3. Click **Logs** tab
4. Scroll to the bottom
5. Should see:
   ```
   Verification API server running on port 3001
   API Secret: a1b2c3... (set VERIFICATION_API_SECRET in .env)
   Cleaned up X expired nonces
   Cleaned up X expired rate limit entries
   ```

✅ **Bot is running with new security!**

---

## 🧪 Quick Test (5 min)

**💡 EASIEST OPTION: Use the test script!**

Run this PowerShell script (it does all tests automatically):
```powershell
# First, edit test-api.ps1 and set your domain and secret
# Then run:
.\test-api.ps1
```

**OR manually test each feature below:**

### Test 1: Does rate limiting work?

**PowerShell Command (Run 6 times):**
```powershell
$body = @{
    nonce = "test-nonce-12345"
    address = "0x123abc"
    discordUserId = "123456789"
    secret = "<your-secret>"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://your-railway-domain.up.railway.app/api/verify" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
```

**Or use this simpler version:**
```powershell
$uri = "https://your-railway-domain.up.railway.app/api/verify"
$body = '{"nonce":"test-nonce-12345","address":"0x123abc","discordUserId":"123456789","secret":"<your-secret>"}'

for ($i = 1; $i -le 6; $i++) {
    Write-Host "Attempt $i:" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
        Write-Host "Success: $($response | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Yellow
        if ($statusCode -eq 429) {
            Write-Host "✅ Rate limit triggered! (This is expected on attempt 6)" -ForegroundColor Green
        } else {
            Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 1
}
```

**Results:**
- Attempts 1-5: Should get some response (or error, but not 429)
- Attempt 6: Should return `HTTP 429 Too Many Requests`

✅ **Rate limiting is working!**

### Test 2: Does user authentication work?

**PowerShell Command:**
```powershell
$uri = "https://your-railway-domain.up.railway.app/api/verify"
$body = '{"nonce":"test-nonce-12345","address":"0x123abc","discordUserId":"wrong-user-id","secret":"<your-secret>"}'

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    if ($statusCode -eq 403) {
        Write-Host "✅ User authentication working! (403 Forbidden is expected)" -ForegroundColor Green
    }
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
```

**Results:**
- Should return `HTTP 403 Forbidden`
- Message: "You are not authorized to verify this nonce"

✅ **User authentication is working!**

---

## ✅ You're Done!

**Total time: 30 minutes**

Your bot is now:
- ✅ Rate-limited (can't be hacked with brute force)
- ✅ User-authenticated (can't steal wallets)
- ✅ HTTPS encrypted (data is safe)
- ✅ Production-ready (enterprise security)

---

## 🐛 If Something Goes Wrong

### "Connection refused"
→ Wait 5 minutes, Railway might still be deploying

### "HTTPS certificate error"
→ Railway auto-renews, wait 24 hours or try different domain

### "Rate limiting not working"
→ Make sure `VERIFICATION_API_SECRET` is set in Railway

### "User authentication failing"
→ Make sure Vercel is sending `discordUserId` in requests

### "Commands not working in Discord"
→ Restart bot: Stop and start service in Railway

---

## 📖 More Information

- **Full setup guide**: See `RAILWAY_HTTPS_SETUP.md`
- **Detailed checklist**: See `DEPLOYMENT_CHECKLIST.md`
- **Security details**: See `SECURITY_IMPLEMENTATION.md`
- **Complete overview**: See `SECURITY_COMPLETE.md`

---

## 🎯 That's It!

Your crypto verification system is now production-grade secure! 🚀

**Questions?** Check the documentation files or test the endpoints to verify everything works.


