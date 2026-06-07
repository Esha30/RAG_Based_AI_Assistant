
# ── RAG AI Assistant: Real Environment Test ─────────────────────────────────
$BACKEND  = "http://127.0.0.1:8000"
$FRONTEND = "http://localhost:3000"
$pass = 0; $fail = 0

function OK  ($msg) { Write-Host "    [PASS] $msg" -ForegroundColor Green;  $script:pass++ }
function FAIL($msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red;    $script:fail++ }
function WARN($msg) { Write-Host "    [WARN] $msg" -ForegroundColor DarkYellow }
function HEAD($msg) { Write-Host "`n$msg" -ForegroundColor Yellow }

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   RAG AI Assistant - Real Environment Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── 1. Backend Health ─────────────────────────────────────────────────────────
HEAD "[1] Backend Health"
try {
    $r = Invoke-WebRequest -Uri "$BACKEND/health" -UseBasicParsing
    if ($r.StatusCode -eq 200) { OK "HTTP $($r.StatusCode) - $($r.Content)" }
    else { FAIL "Unexpected status $($r.StatusCode)" }
} catch { FAIL $_ }

# ── 2. Backend Root ───────────────────────────────────────────────────────────
HEAD "[2] Backend Root"
try {
    $r = Invoke-RestMethod -Uri "$BACKEND/"
    OK "Message: $($r.message) | Version: $($r.version)"
} catch { FAIL $_ }

# ── 3. Frontend HTML ─────────────────────────────────────────────────────────
HEAD "[3] Frontend HTML (localhost:3000)"
try {
    $r = Invoke-WebRequest -Uri $FRONTEND -UseBasicParsing
    if ($r.StatusCode -eq 200) { OK "HTTP $($r.StatusCode) - Page loaded" }
    else { FAIL "HTTP $($r.StatusCode)" }

    # Verify MetaMask suppression script is embedded
    if ($r.Content -match "MetaMask")           { OK "MetaMask suppression: PRESENT in HTML" }
    else                                         { FAIL "MetaMask suppression: MISSING from HTML" }

    if ($r.Content -match "window\.ethereum")   { OK "window.ethereum stub: PRESENT" }
    else                                         { FAIL "window.ethereum stub: MISSING" }

    if ($r.Content -match "unhandledrejection") { OK "unhandledrejection guard: PRESENT" }
    else                                         { FAIL "unhandledrejection guard: MISSING" }

    if ($r.Content -match "chrome-extension")   { OK "chrome-extension filter: PRESENT" }
    else                                         { FAIL "chrome-extension filter: MISSING" }
} catch { FAIL $_ }

# ── 4. Swagger Docs ───────────────────────────────────────────────────────────
HEAD "[4] Swagger API Docs (/docs)"
try {
    $r = Invoke-WebRequest -Uri "$BACKEND/docs" -UseBasicParsing
    if ($r.StatusCode -eq 200) { OK "Swagger UI available" }
    else { FAIL "HTTP $($r.StatusCode)" }
} catch { FAIL $_ }

# ── 5. Auth - Login ───────────────────────────────────────────────────────────
HEAD "[5] Auth: Login"
$token = $null
try {
    $body = '{"email":"demo@ragassistant.ai","password":"Demo1234!"}'
    $login = Invoke-RestMethod -Method POST -Uri "$BACKEND/api/auth/login" -ContentType "application/json" -Body $body
    $token = $login.access_token
    if ($token -and $token.Length -gt 20) {
        OK "JWT issued (${token}".Substring(0,40) + "...)"
    } else { FAIL "Empty token returned" }
} catch { FAIL $_ }

# ── 6-9. Protected Endpoints ──────────────────────────────────────────────────
if ($token) {
    $h = @{ Authorization = "Bearer $token" }

    HEAD "[6] Profile (/api/auth/me)"
    try {
        $me = Invoke-RestMethod -Uri "$BACKEND/api/auth/me" -Headers $h
        OK "User: $($me.username) | $($me.email)"
    } catch { FAIL $_ }

    HEAD "[7] Documents (/api/documents/)"
    try {
        $docs = Invoke-RestMethod -Uri "$BACKEND/api/documents/" -Headers $h
        OK "Document count: $($docs.documents.Count)"
    } catch { FAIL $_ }

    HEAD "[8] Chats (/api/chats/)"
    try {
        $chats = Invoke-RestMethod -Uri "$BACKEND/api/chats/" -Headers $h
        OK "Chat count: $($chats.chats.Count)"
    } catch { FAIL $_ }

    HEAD "[9] Analytics (/api/analytics/)"
    try {
        $a = Invoke-RestMethod -Uri "$BACKEND/api/analytics/" -Headers $h
        OK "Docs: $($a.document_count) | Chats: $($a.chat_count) | AI Responses: $($a.ai_responses)"
    } catch { FAIL $_ }
} else {
    WARN "Skipping protected endpoint tests (no token)"
}

# ── 10. CORS Headers ──────────────────────────────────────────────────────────
HEAD "[10] CORS Headers"
try {
    $r = Invoke-WebRequest -Uri "$BACKEND/health" -UseBasicParsing `
         -Headers @{ Origin = "http://localhost:3000"; "Access-Control-Request-Method" = "GET" }
    $cors = $r.Headers["Access-Control-Allow-Origin"]
    if ($cors) { OK "Access-Control-Allow-Origin: $cors" }
    else { WARN "CORS header not in simple request (preflight may be needed)" }
} catch { FAIL $_ }

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Cyan
$color = if ($fail -eq 0) { "Green" } else { "Red" }
Write-Host "   PASSED: $pass  |  FAILED: $fail" -ForegroundColor $color
Write-Host "============================================`n" -ForegroundColor Cyan
