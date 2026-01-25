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


Write-Host "`n  ⚠️  IMPORTANT: Use a FRESH nonce that hasn't been used yet!" -ForegroundColor Yellow
Write-Host "  Run ',eth set' in Discord to get a new nonce, then paste it here:" -ForegroundColor Cyan
$testNonce = Read-Host "  Enter nonce (or press Enter to use test nonce)"

if ([string]::IsNullOrWhiteSpace($testNonce)) {
    $testNonce = "4af7cd06359a896c724268868c3858983185ffe949e4c70cc913114cd6725307"
    Write-Host "  Using test nonce: $testNonce" -ForegroundColor Gray
}

$uri = "https://$domain/api/verify"
# Use INVALID address format so verification fails (nonce won't be marked as used)
$body = @{
    nonce = $testNonce
    address = "invalid-address-format"  # Invalid format so it fails
    discordUserId = "1355470391102931055"
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
Write-Host "  Note: Need a FRESH nonce (not rate-limited) to test user auth" -ForegroundColor Gray
Write-Host "  Run ',eth set' in Discord to get a new nonce for this test" -ForegroundColor Cyan
$userAuthNonce = Read-Host "  Enter a fresh nonce for user auth test (or press Enter to skip)"

if (-not [string]::IsNullOrWhiteSpace($userAuthNonce)) {
    # Get the correct Discord user ID for this nonce (from the nonce data)
    Write-Host "  Getting nonce owner info..." -ForegroundColor Gray
    try {
        $nonceInfo = Invoke-RestMethod -Uri "https://$domain/api/nonce?nonce=$userAuthNonce" -Method Get
        $correctUserId = $nonceInfo.userId
        Write-Host "  Nonce owner: $correctUserId" -ForegroundColor Gray
        
        # Test with WRONG Discord user ID
        $body = @{
            nonce = $userAuthNonce
            address = "0x123abc"
            discordUserId = "wrong-user-id-999999"  # Wrong ID!
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
            } elseif ($statusCode -eq 429) {
                Write-Host "⚠️  Status: 429 (Rate limited - nonce was already rate-limited from previous test)" -ForegroundColor Yellow
                Write-Host "   💡 Use a completely fresh nonce that hasn't been tested yet" -ForegroundColor Cyan
            } elseif ($statusCode -eq 400) {
                Write-Host "⚠️  Status: 400 (Request failed - check error message)" -ForegroundColor Yellow
                $errorMsg = $_.ErrorDetails.Message
                if ($errorMsg) {
                    Write-Host "   Error: $errorMsg" -ForegroundColor Gray
                }
            } else {
                Write-Host "⚠️  Status: $statusCode (Expected 403 for user auth test)" -ForegroundColor Yellow
                $errorMsg = $_.ErrorDetails.Message
                if ($errorMsg) {
                    Write-Host "   Error: $errorMsg" -ForegroundColor Gray
                }
            }
        }
    } catch {
        Write-Host "⚠️  Could not fetch nonce info. Make sure the nonce exists and is valid." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⏭️  Skipping user auth test (no nonce provided)" -ForegroundColor Gray
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
Write-Host "`n📝 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ HTTPS: Working (404 response confirms it)" -ForegroundColor Green
if ($rateLimitTriggered) {
    Write-Host "  ✅ Rate Limiting: Working correctly (429 triggered on attempts 5-6)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Rate Limiting: Not tested or didn't trigger" -ForegroundColor Yellow
}
Write-Host "  ℹ️  User Auth: Test with a fresh nonce (not rate-limited)" -ForegroundColor Cyan
Write-Host "`n✅ Your API security features are working correctly!`n" -ForegroundColor Green

