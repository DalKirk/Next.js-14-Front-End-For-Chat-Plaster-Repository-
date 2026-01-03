# DNS Verification Script for starcyeed.com
# Run this after configuring DNS records at your registrar

Write-Host "`n🔍 Checking DNS Configuration for starcyeed.com...`n" -ForegroundColor Cyan

# Check apex domain (starcyeed.com)
Write-Host "Checking apex domain (starcyeed.com)..." -ForegroundColor Yellow
try {
    $apexResult = Resolve-DnsName -Name "starcyeed.com" -Type A -ErrorAction Stop
    Write-Host "✓ starcyeed.com resolves to:" -ForegroundColor Green
    $apexResult | Where-Object { $_.Type -eq 'A' } | ForEach-Object {
        Write-Host "  → $($_.IPAddress)" -ForegroundColor White
        if ($_.IPAddress -eq "76.76.21.21") {
            Write-Host "  ✓ Correct Vercel IP!" -ForegroundColor Green
        }
        else {
            Write-Host "  ⚠ Expected 76.76.21.21 for Vercel" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "✗ starcyeed.com not found (DNS not propagated yet)" -ForegroundColor Red
}

Write-Host ""

# Check www subdomain
Write-Host "Checking www.starcyeed.com..." -ForegroundColor Yellow
try {
    $wwwResult = Resolve-DnsName -Name "www.starcyeed.com" -ErrorAction Stop
    Write-Host "✓ www.starcyeed.com resolves to:" -ForegroundColor Green
    $wwwResult | Where-Object { $_.Type -eq 'CNAME' } | ForEach-Object {
        Write-Host "  → $($_.NameHost) (CNAME)" -ForegroundColor White
    }
    $wwwResult | Where-Object { $_.Type -eq 'A' } | ForEach-Object {
        Write-Host "  → $($_.IPAddress) (A)" -ForegroundColor White
    }
}
catch {
    Write-Host "✗ www.starcyeed.com not found (DNS not propagated yet)" -ForegroundColor Red
}

Write-Host ""

# Check API subdomain
Write-Host "Checking api.starcyeed.com..." -ForegroundColor Yellow
try {
    $apiResult = Resolve-DnsName -Name "api.starcyeed.com" -ErrorAction Stop
    Write-Host "✓ api.starcyeed.com resolves to:" -ForegroundColor Green
    $apiResult | Where-Object { $_.Type -eq 'CNAME' } | ForEach-Object {
        Write-Host "  → $($_.NameHost) (CNAME)" -ForegroundColor White
        if ($_.NameHost -like "*.up.railway.app") {
            Write-Host "  ✓ Points to Railway!" -ForegroundColor Green
        }
    }
    $apiResult | Where-Object { $_.Type -eq 'A' } | ForEach-Object {
        Write-Host "  → $($_.IPAddress) (A)" -ForegroundColor White
    }
}
catch {
    Write-Host "✗ api.starcyeed.com not found (DNS not propagated yet)" -ForegroundColor Red
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# HTTP/HTTPS Checks (only if DNS is resolved)
Write-Host "Testing HTTPS connections...`n" -ForegroundColor Cyan

# Test www
Write-Host "Testing https://www.starcyeed.com..." -ForegroundColor Yellow
try {
    $wwwResponse = Invoke-WebRequest -Uri "https://www.starcyeed.com" -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Status: $($wwwResponse.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test apex
Write-Host "Testing https://starcyeed.com..." -ForegroundColor Yellow
try {
    $apexResponse = Invoke-WebRequest -Uri "https://starcyeed.com" -Method Head -TimeoutSec 10 -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "✓ Status: $($apexResponse.StatusCode)" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 301 -or $_.Exception.Response.StatusCode -eq 308) {
        Write-Host "✓ Redirects to www (expected)" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test API
Write-Host "Testing https://api.starcyeed.com..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "https://api.starcyeed.com/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Status: $($apiResponse.StatusCode)" -ForegroundColor Green
    Write-Host "✓ Backend is responding!" -ForegroundColor Green
}
catch {
    Write-Host "⚠ Backend health check failed (endpoint may not exist yet)" -ForegroundColor Yellow
    Write-Host "  Try: https://api.starcyeed.com/ instead" -ForegroundColor Gray
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
Write-Host "DNS propagation can take 5-30 minutes." -ForegroundColor Gray
Write-Host "Run this script again after adding DNS records.`n" -ForegroundColor Gray
