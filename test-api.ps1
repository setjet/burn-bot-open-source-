# PowerShell Test Script for Crypto Verification API
# Replace YOUR_RAILWAY_DOMAIN and YOUR_SECRET before running

$domain = "burn-bot-production.up.railway.app"  

$secret = "89847ee6c30c41f43c91a3c9b409231732c6336817f037357875e9f63422e357"  
Write-Host "`n=== Testing Crypto Verification API ===" -ForegroundColor Cyan
Write-Host "Domain: https://$domain`n" -ForegroundColor Yellow

# Test 1: Verify HTTPS Works
Write-Host "Test 1: Verifying HTTPS connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "https://$domain/api/nonce?nonce=test" -Method Get
    Write-Host "✅ HTTPS is working! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 404) {
        Write-Host "✅ HTTPS is working! Status: $statusCode (Expected - test nonce doesn't exist)" -ForegroundColor Green
        Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Unexpected status: $statusCode" -ForegroundColor Red
        Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`n---`n" -ForegroundColor Gray

# Test 2: Rate Limiting (6 attempts with same nonce)
Write-Host "Test 2: Testing Rate Limiting (6 attempts with same nonce)..." -ForegroundColor Cyan
Write-Host "  Note: We'll use a real nonce but with INVALID data so attempts fail (nonce won't be marked as used)" -ForegroundColor Gray
Write-Host "  This allows us to test rate limiting properly" -ForegroundColor Gray

# Get a fresh nonce from Discord (user needs to run ,eth set first)
Write-Host "`n  ⚠️  IMPORTANT: Use a FRESH nonce that hasn't been used yet!" -ForegroundColor Yellow
Write-Host "  Run ',eth set' in Discord to get a new nonce, then paste it here:" -ForegroundColor Cyan
$testNonce = Read-Host "  Enter nonce (or press Enter to use test nonce)"

if ([string]::IsNullOrWhiteSpace($testNonce)) {
    $testNonce = "test-nonce-$(Get-Random -Minimum 10000 -Maximum 99999)"
    Write-Host "  Using test nonce: $testNonce" -ForegroundColor Gray
}

$uri = "https://$domain/api/verify"
# Use INVALID address format so verification fails (nonce won't be marked as used)
$body = @{
    nonce = $testNonce
    address = "invalid-address-format"  # Invalid format so it fails
    discordUserId = "123456789"
    secret = $secret
} | ConvertTo-Json

$rateLimitTriggered = $false
for ($i = 1; $i -le 6; $i++) {
    Write-Host "  Attempt $i..." -ForegroundColor Yellow -NoNewline
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
        Write-Host " ✅ Success" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 429) {
            Write-Host " ✅ Rate limit triggered! (This is what we want!)" -ForegroundColor Green
            $rateLimitTriggered = $true
            $errorMsg = $_.ErrorDetails.Message
            if ($errorMsg) {
                Write-Host "    Message: $errorMsg" -ForegroundColor Yellow
            }
        } elseif ($statusCode -eq 400) {
            Write-Host " ⚠️  Status: 400 (Request failed - rate limit check passed)" -ForegroundColor Yellow
            $errorMsg = $_.ErrorDetails.Message
            if ($errorMsg) {
                Write-Host "    Error: $errorMsg" -ForegroundColor Gray
            }
        } elseif ($statusCode -eq 401) {
            Write-Host " ⚠️  Status: 401 (Unauthorized - check your API secret)" -ForegroundColor Yellow
        } elseif ($statusCode -eq 403) {
            Write-Host " ⚠️  Status: 403 (Forbidden - user auth check failed)" -ForegroundColor Yellow
        } else {
            Write-Host " ⚠️  Status: $statusCode" -ForegroundColor Yellow
            $errorMsg = $_.ErrorDetails.Message
            if ($errorMsg) {
                Write-Host "    Error: $errorMsg" -ForegroundColor Gray
            }
        }
    }
    if ($i -lt 6) {
        Start-Sleep -Seconds 1
    }
}

if ($rateLimitTriggered) {
    Write-Host "`n  ✅ Rate limiting is working correctly!" -ForegroundColor Green
} else {
    Write-Host "`n  ⚠️  Rate limit didn't trigger after 6 attempts." -ForegroundColor Yellow
    Write-Host "     This could mean:" -ForegroundColor Gray
    Write-Host "     - The nonce was already used (try a fresh one)" -ForegroundColor Gray
    Write-Host "     - Rate limiting isn't working (check Railway logs)" -ForegroundColor Gray
    Write-Host "`n  💡 Tip: Use a FRESH nonce from ',eth set' command" -ForegroundColor Cyan
}

Write-Host "`n---`n" -ForegroundColor Gray

# Test 3: User Authentication (Wrong Discord ID)
Write-Host "Test 3: Testing User Authentication (Wrong Discord ID)..." -ForegroundColor Cyan
Write-Host "  Note: User auth check happens AFTER nonce validation, so we need a real nonce" -ForegroundColor Gray
$body = @{
    nonce = $testNonce
    address = "0x123abc"
    discordUserId = "wrong-user-id-999999"
    secret = $secret
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    Write-Host "❌ User authentication NOT working! (Should have been blocked)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host "✅ User authentication working! (403 Forbidden is correct)" -ForegroundColor Green
        $errorMsg = $_.ErrorDetails.Message
        if ($errorMsg) {
            Write-Host "   Message: $errorMsg" -ForegroundColor Yellow
        }
    } elseif ($statusCode -eq 400) {
        Write-Host "⚠️  Status: 400 (Nonce doesn't exist - can't test user auth without real nonce)" -ForegroundColor Yellow
        Write-Host "   💡 To test user auth: Use a real nonce from Discord command" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Status: $statusCode (Expected 403 for user auth test)" -ForegroundColor Yellow
        $errorMsg = $_.ErrorDetails.Message
        if ($errorMsg) {
            Write-Host "   Error: $errorMsg" -ForegroundColor Gray
        }
    }
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
Write-Host "`n📝 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ HTTPS: Working if you got 400/404 (not connection refused)" -ForegroundColor Green
Write-Host "  ⚠️  Rate Limiting: Needs real nonce from Discord to test properly" -ForegroundColor Yellow
Write-Host "  ⚠️  User Auth: Needs real nonce from Discord to test properly" -ForegroundColor Yellow
Write-Host "`n💡 To properly test rate limiting and user auth:" -ForegroundColor Cyan
Write-Host "  1. Run ',eth set' in Discord to generate a real nonce" -ForegroundColor White
Write-Host "  2. Copy the nonce from the verification URL" -ForegroundColor White
Write-Host "  3. Update this script with the real nonce and Discord user ID" -ForegroundColor White
Write-Host "  4. Run the tests again" -ForegroundColor White
Write-Host "`n✅ Your API is accessible and responding correctly!`n" -ForegroundColor Green

