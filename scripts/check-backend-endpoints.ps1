# Backend Endpoint Diagnostic Tool
# Tests which endpoints are actually available on Railway

$API = "https://web-production-3ba7e.up.railway.app"
$Origin = "https://video-chat-frontend-seven.vercel.app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 Backend Endpoint Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Root/Health Check
Write-Host "Test 1: Root/Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API/" -Method GET -ErrorAction Stop
    Write-Host "✅ GET / - Success" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ GET / - Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: /health endpoint
Write-Host "Test 2: /health endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API/health" -Method GET -ErrorAction Stop
    Write-Host "✅ GET /health - Success" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ GET /health - Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Create User
Write-Host "Test 3: POST /users (Create User)" -ForegroundColor Yellow
try {
    $userBody = @{username="test-user-$(Get-Random -Maximum 9999)"} | ConvertTo-Json
    $user = Invoke-RestMethod -Uri "$API/users" -Method POST -Body $userBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ POST /users - Success" -ForegroundColor Green
    $userId = $user.id
    Write-Host "Created User ID: $userId"
    $user | ConvertTo-Json
} catch {
    Write-Host "❌ POST /users - Failed: $($_.Exception.Message)" -ForegroundColor Red
    $userId = $null
}
Write-Host ""

# Test 4: Get User (if created)
if ($userId) {
    Write-Host "Test 4: GET /users/{id}" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API/users/$userId" -Method GET -ErrorAction Stop
        Write-Host "✅ GET /users/{id} - Success" -ForegroundColor Green
        $response | ConvertTo-Json
    } catch {
        Write-Host "❌ GET /users/{id} - Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 5: List Rooms
Write-Host "Test 5: GET /rooms (List Rooms)" -ForegroundColor Yellow
try {
    $rooms = Invoke-RestMethod -Uri "$API/rooms" -Method GET -ErrorAction Stop
    Write-Host "✅ GET /rooms - Success" -ForegroundColor Green
    Write-Host "Found $($rooms.Count) rooms"
    $rooms | Select-Object -First 2 | ConvertTo-Json
} catch {
    Write-Host "❌ GET /rooms - Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Create Room
Write-Host "Test 6: POST /rooms (Create Room)" -ForegroundColor Yellow
try {
    $roomBody = @{name="Test Room $(Get-Random -Maximum 9999)"} | ConvertTo-Json
    $room = Invoke-RestMethod -Uri "$API/rooms" -Method POST -Body $roomBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "✅ POST /rooms - Success" -ForegroundColor Green
    $roomId = $room.id
    Write-Host "Created Room ID: $roomId"
    $room | ConvertTo-Json
} catch {
    Write-Host "❌ POST /rooms - Failed: $($_.Exception.Message)" -ForegroundColor Red
    $roomId = $null
}
Write-Host ""

# Test 7: Join Room (if room and user created)
if ($roomId -and $userId) {
    Write-Host "Test 7: POST /rooms/{id}/join" -ForegroundColor Yellow
    try {
        $joinBody = @{
            user_id=$userId
            username="TestUser"
            avatar_url="https://ui-avatars.com/api/?name=Test"
        } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$API/rooms/$roomId/join" -Method POST -Body $joinBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "✅ POST /rooms/{id}/join - Success" -ForegroundColor Green
        $response | ConvertTo-Json
    } catch {
        Write-Host "❌ POST /rooms/{id}/join - Failed: $($_.Exception.Message)" -ForegroundColor Red
        
        # Try alternate endpoint
        Write-Host "   Trying alternate: POST /{id}/join" -ForegroundColor Gray
        try {
            $response = Invoke-RestMethod -Uri "$API/$roomId/join" -Method POST -Body $joinBody -ContentType "application/json" -ErrorAction Stop
            Write-Host "✅ POST /{id}/join - Success (alternate path)" -ForegroundColor Green
            $response | ConvertTo-Json
        } catch {
            Write-Host "❌ POST /{id}/join - Also failed" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Test 8: Check API docs
Write-Host "Test 8: API Documentation" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API/docs" -Method GET -ErrorAction Stop
    Write-Host "✅ GET /docs - Available at $API/docs" -ForegroundColor Green
} catch {
    Write-Host "❌ GET /docs - Not available" -ForegroundColor Red
}
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$API/redoc" -Method GET -ErrorAction Stop
    Write-Host "✅ GET /redoc - Available at $API/redoc" -ForegroundColor Green
} catch {
    Write-Host "❌ GET /redoc - Not available" -ForegroundColor Red
}
Write-Host ""

# Test 9: CORS Headers
Write-Host "Test 9: CORS Headers" -ForegroundColor Yellow
try {
    $headers = @{"Origin"=$Origin}
    $response = Invoke-WebRequest -Uri "$API/health" -Headers $headers -UseBasicParsing -ErrorAction Stop
    $corsOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $corsCredentials = $response.Headers["Access-Control-Allow-Credentials"]
    
    if ($corsOrigin) {
        Write-Host "✅ CORS Origin: $corsOrigin" -ForegroundColor Green
        Write-Host "   Credentials: $corsCredentials" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ No CORS headers found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ CORS check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see 404 errors for /users or /rooms/{id}/join," -ForegroundColor Yellow
Write-Host "your backend needs to implement these endpoints." -ForegroundColor Yellow
Write-Host ""
Write-Host "Check the FastAPI app to see what routes are registered:" -ForegroundColor Cyan
Write-Host "Visit: $API/docs" -ForegroundColor Cyan
Write-Host ""
