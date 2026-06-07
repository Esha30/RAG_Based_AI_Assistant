# ─── Test RAG AI Assistant API ─────────────────────────────────────────────
$BASE = "http://127.0.0.1:8000"

Write-Host "`n=== RAG AI Assistant API Test ===" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1] Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$BASE/health"
Write-Host "    Status: $($health.status)" -ForegroundColor Green

# 2. Root
Write-Host "`n[2] Root Endpoint..." -ForegroundColor Yellow
$root = Invoke-RestMethod -Uri "$BASE/"
Write-Host "    Message: $($root.message)" -ForegroundColor Green
Write-Host "    Version: $($root.version)" -ForegroundColor Green

# 3. Register a test user
Write-Host "`n[3] Register Test User..." -ForegroundColor Yellow
$regBody = @{
    email    = "demo@ragassistant.ai"
    username = "demouser"
    password = "Demo1234!"
} | ConvertTo-Json

try {
    $reg = Invoke-RestMethod -Method POST -Uri "$BASE/api/auth/register" `
        -ContentType "application/json" -Body $regBody
    Write-Host "    Registered: $($reg.user.username) ($($reg.user.email))" -ForegroundColor Green
    Write-Host "    User ID: $($reg.user.id)" -ForegroundColor Green
    Write-Host "    Token issued: YES" -ForegroundColor Green
} catch {
    $errMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "    Note: $($errMsg.detail)" -ForegroundColor DarkYellow
}

# 4. Login
Write-Host "`n[4] Login..." -ForegroundColor Yellow
$loginBody = @{ email = "demo@ragassistant.ai"; password = "Demo1234!" } | ConvertTo-Json
try {
    $login = Invoke-RestMethod -Method POST -Uri "$BASE/api/auth/login" `
        -ContentType "application/json" -Body $loginBody
    $token = $login.access_token
    Write-Host "    Login SUCCESS! Token: $($token.Substring(0, 30))..." -ForegroundColor Green
} catch {
    Write-Host "    Login FAILED: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# 5. Get Profile
Write-Host "`n[5] Get User Profile..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $token" }
try {
    $profile = Invoke-RestMethod -Uri "$BASE/api/auth/me" -Headers $headers
    Write-Host "    Profile: $($profile.username) | $($profile.email)" -ForegroundColor Green
} catch {
    Write-Host "    Profile FAILED: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# 6. List Documents
Write-Host "`n[6] List Documents..." -ForegroundColor Yellow
try {
    $docs = Invoke-RestMethod -Uri "$BASE/api/documents/" -Headers $headers
    Write-Host "    Documents found: $($docs.documents.Count)" -ForegroundColor Green
} catch {
    Write-Host "    Documents FAILED: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# 7. List Chats
Write-Host "`n[7] List Chats..." -ForegroundColor Yellow
try {
    $chats = Invoke-RestMethod -Uri "$BASE/api/chats/" -Headers $headers
    Write-Host "    Chats found: $($chats.chats.Count)" -ForegroundColor Green
} catch {
    Write-Host "    Chats FAILED: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# 8. Analytics
Write-Host "`n[8] Analytics..." -ForegroundColor Yellow
try {
    $analytics = Invoke-RestMethod -Uri "$BASE/api/analytics/" -Headers $headers
    Write-Host "    Docs: $($analytics.document_count) | Chats: $($analytics.chat_count) | AI Responses: $($analytics.ai_responses)" -ForegroundColor Green
} catch {
    Write-Host "    Analytics FAILED: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host "`nFrontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Magenta
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Magenta
