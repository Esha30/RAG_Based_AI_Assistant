$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:8000/api"
$pass = 0
$fail = 0
$ts = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "testuser_$ts@example.com"
$testUser  = "testuser_$ts"
$testPass  = "TestPass123!"

function Ok($msg)    { Write-Host "  [PASS] $msg" -ForegroundColor Green;  $script:pass++ }
function Fail($msg)  { Write-Host "  [FAIL] $msg" -ForegroundColor Red;    $script:fail++ }
function Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }

# ── 1. Health ─────────────────────────────────────────────────────────────────
Section "1. Health Check"
try {
    $r = Invoke-RestMethod "http://localhost:8000/health" -Method GET
    if ($r.status -eq "healthy") { Ok "Backend is healthy" } else { Fail "Status: $($r.status)" }
} catch { Fail "Health unreachable: $_" }

# ── 2. Register ───────────────────────────────────────────────────────────────
Section "2. Auth - Registration  [POST /api/auth/register]"
try {
    $body = '{"email":"' + $testEmail + '","username":"' + $testUser + '","password":"' + $testPass + '"}'
    $r = Invoke-RestMethod "$baseUrl/auth/register" -Method POST -Body $body -ContentType "application/json"
    if ($r.access_token) { Ok "Registration OK (user: $testUser)" }
    else { Fail "No access_token: $($r | ConvertTo-Json -Compress)" }
} catch { Fail "Register failed: $_" }

# ── 3. Login ──────────────────────────────────────────────────────────────────
Section "3. Auth - Login  [POST /api/auth/login]"
$token = $null
try {
    $body = '{"email":"' + $testEmail + '","password":"' + $testPass + '"}'
    $r = Invoke-RestMethod "$baseUrl/auth/login" -Method POST -Body $body -ContentType "application/json"
    $token = $r.access_token
    if ($token) { Ok "Login OK - JWT received" }
    else { Fail "No access_token: $($r | ConvertTo-Json -Compress)" }
} catch { Fail "Login failed: $_" }

if (-not $token) { Write-Host "`n[ABORT] No token." -ForegroundColor Red; exit 1 }
$headers = @{ Authorization = "Bearer $token" }

# ── 4. Profile ────────────────────────────────────────────────────────────────
Section "4. Auth - Profile  [GET /api/auth/me]"
try {
    $r = Invoke-RestMethod "$baseUrl/auth/me" -Method GET -Headers $headers
    if ($r.email -eq $testEmail) { Ok "Profile correct (email: $($r.email))" }
    else { Fail "Email mismatch: $($r.email)" }
} catch { Fail "Profile failed: $_" }

# ── 5. Documents list ─────────────────────────────────────────────────────────
Section "5. Documents - List  [GET /api/documents/]"
try {
    $r = Invoke-RestMethod "$baseUrl/documents/" -Method GET -Headers $headers
    $docList = $r.documents
    Ok "Document list OK (count: $($docList.Count))"
} catch { Fail "Document list failed: $_" }

# ── 6. Upload document ────────────────────────────────────────────────────────
Section "6. Documents - Upload  [POST /api/documents/upload]"
$docId = $null
try {
    $tmpFile = Join-Path $env:TEMP "rag_test_$ts.txt"
    $lines = @(
        "Artificial Intelligence in Healthcare",
        "",
        "AI is transforming modern healthcare in several key ways.",
        "This document covers five major application areas.",
        "",
        "1. Medical Imaging: Deep learning detects cancer in X-rays and MRIs with 94 percent accuracy.",
        "   Google DeepMind achieved outstanding results in breast cancer detection studies.",
        "",
        "2. Drug Discovery: AI reduces development timelines from years to months.",
        "   AlphaFold2 solved the protein-folding problem enabling faster drug target identification.",
        "",
        "3. Personalized Medicine: ML analyzes genetic profiles to tailor treatments to individuals.",
        "   IBM Watson for Oncology recommends personalized cancer treatment plans.",
        "",
        "4. Remote Patient Monitoring: IoT sensors combined with AI detect early warning signs.",
        "   Wearables can predict atrial fibrillation days before it occurs.",
        "",
        "5. Administrative Efficiency: NLP automates clinical documentation saving physicians 2-3 hours daily.",
        "",
        "Conclusion: AI will empower doctors with superhuman pattern recognition and data capabilities."
    )
    [System.IO.File]::WriteAllLines($tmpFile, $lines, [System.Text.Encoding]::UTF8)

    Add-Type -AssemblyName System.Net.Http
    $httpClient = [System.Net.Http.HttpClient]::new()
    $httpClient.DefaultRequestHeaders.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $token)

    $multipart   = [System.Net.Http.MultipartFormDataContent]::new()
    $fileBytes   = [System.IO.File]::ReadAllBytes($tmpFile)
    $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
    $fileContent.Headers.ContentType =
        [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("text/plain")
    $multipart.Add($fileContent, "file", "ai_healthcare_$ts.txt")

    $resp    = $httpClient.PostAsync("$baseUrl/documents/upload", $multipart).Result
    $rawBody = $resp.Content.ReadAsStringAsync().Result
    $parsed  = $rawBody | ConvertFrom-Json

    # Response: {"message":"...","document":{...}}
    $docObj = $parsed.document
    if ($resp.IsSuccessStatusCode -and $docObj -and $docObj.id) {
        $docId = $docObj.id
        Ok "Uploaded - ID: $docId, Status: $($docObj.status)"
    } else {
        Fail "Upload failed HTTP $($resp.StatusCode): $rawBody"
    }
    $httpClient.Dispose()
    Remove-Item $tmpFile -Force
} catch { Fail "Upload exception: $_" }

# ── 7. Poll until processed ───────────────────────────────────────────────────
Section "7. Documents - Processing  (polling up to 2 min)"
$processed = $false
$doc = $null
if ($docId) {
    for ($i = 1; $i -le 20; $i++) {
        Start-Sleep -Seconds 6
        try {
            $r    = Invoke-RestMethod "$baseUrl/documents/" -Method GET -Headers $headers
            $docs = $r.documents
            $doc  = $docs | Where-Object { $_.id -eq $docId } | Select-Object -First 1
            if ($doc) {
                Write-Host "    Attempt $i - Status: $($doc.status), Chunks: $($doc.chunk_count)" -ForegroundColor Yellow
                if ($doc.status -eq "processed") {
                    Ok "Document processed! Chunks: $($doc.chunk_count)"
                    $processed = $true; break
                } elseif ($doc.status -eq "error") {
                    Fail "Processing returned error status"
                    break
                }
            }
        } catch { Write-Host "    Poll error: $_" -ForegroundColor DarkYellow }
    }
    if (-not $processed -and ($null -eq $doc -or $doc.status -ne "error")) {
        Fail "Document still not processed after 2 minutes"
    }
} else { Write-Host "  [SKIP] No docId" -ForegroundColor Yellow }

# ── 8. Create chat ────────────────────────────────────────────────────────────
Section "8. Chat - Create  [POST /api/chats/]"
$chatId = $null
try {
    $body = '{"title":"Test Chat ' + $ts + '","document_ids":[]}'
    $r = Invoke-RestMethod "$baseUrl/chats/" -Method POST -Body $body -ContentType "application/json" -Headers $headers
    $chatId = $r.id
    if ($chatId) { Ok "Chat created: $chatId" }
    else { Fail "No chat ID: $($r | ConvertTo-Json -Compress)" }
} catch { Fail "Chat create failed: $_" }

# ── 9. List chats ─────────────────────────────────────────────────────────────
Section "9. Chat - List  [GET /api/chats/]"
try {
    $r = Invoke-RestMethod "$baseUrl/chats/" -Method GET -Headers $headers
    $chatList = $r.chats
    Ok "Chats listed (count: $($chatList.Count))"
} catch { Fail "List chats failed: $_" }

# ── 10. RAG streaming message ─────────────────────────────────────────────────
Section "10. Chat - RAG Streaming  [POST /api/chats/{id}/messages]"
if ($chatId -and $processed) {
    try {
        $docIdsJson = '["' + $docId + '"]'
        $msgBody    = '{"content":"What are the main ways AI is used in healthcare?","document_ids":' + $docIdsJson + '}'
        $bodyBytes  = [System.Text.Encoding]::UTF8.GetBytes($msgBody)

        $req = [System.Net.HttpWebRequest]::Create("$baseUrl/chats/$chatId/messages")
        $req.Method        = "POST"
        $req.ContentType   = "application/json"
        $req.ContentLength = $bodyBytes.Length
        $req.Headers.Add("Authorization", "Bearer $token")
        $req.Accept        = "text/event-stream"
        $req.Timeout       = 60000

        $reqStream = $req.GetRequestStream()
        $reqStream.Write($bodyBytes, 0, $bodyBytes.Length)
        $reqStream.Close()

        $resp       = $req.GetResponse()
        $respStream = $resp.GetResponseStream()
        $reader     = [System.IO.StreamReader]::new($respStream)

        $chunks   = 0
        $fullText = ""
        $sw = [System.Diagnostics.Stopwatch]::StartNew()

        while (-not $reader.EndOfStream -and $sw.Elapsed.TotalSeconds -lt 60) {
            $line = $reader.ReadLine()
            if ($line -match "^data: (.+)$") {
                $data = $Matches[1]
                try {
                    $parsed = $data | ConvertFrom-Json
                    if ($parsed.type -eq "chunk" -and $parsed.content) {
                        $fullText += $parsed.content
                        $chunks++
                    } elseif ($parsed.type -eq "done") {
                        break
                    }
                } catch {}
            }
        }
        $reader.Close()
        $resp.Close()

        if ($chunks -gt 0 -and $fullText.Length -gt 20) {
            Ok "RAG streaming OK - $chunks chunks, $($fullText.Length) chars"
            $preview = $fullText.Substring(0, [Math]::Min(300, $fullText.Length))
            Write-Host "    Preview: $preview" -ForegroundColor Gray
        } else {
            Fail "Streaming returned no meaningful content (chunks=$chunks, len=$($fullText.Length))"
        }
    } catch { Fail "Streaming failed: $_" }
} elseif (-not $processed) {
    Write-Host "  [SKIP] Document not processed" -ForegroundColor Yellow
} else {
    Write-Host "  [SKIP] No chat ID" -ForegroundColor Yellow
}

# ── 11. Analytics ─────────────────────────────────────────────────────────────
Section "11. Analytics  [GET /api/analytics/]"
try {
    $r = Invoke-RestMethod "$baseUrl/analytics/" -Method GET -Headers $headers
    Ok "Analytics OK: $($r | ConvertTo-Json -Compress)"
} catch { Fail "Analytics failed: $_" }

# ── 11.5 Resume Analyzer ──────────────────────────────────────────────────────
Section "11.5 Resume Analyzer  [POST /api/resume/analyze]"
try {
    Add-Type -AssemblyName System.Net.Http
    $resClient = [System.Net.Http.HttpClient]::new()
    $resClient.DefaultRequestHeaders.Authorization =
        [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $token)

    $resMultipart = [System.Net.Http.MultipartFormDataContent]::new()
    $resBytes = [System.Text.Encoding]::UTF8.GetBytes("John Doe`nSoftware Engineer`nSkills: Python, SQL`nEducation: BS Computer Science")
    $resFileContent = [System.Net.Http.ByteArrayContent]::new($resBytes)
    $resFileContent.Headers.ContentType =
        [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("text/plain")
    $resMultipart.Add($resFileContent, "file", "resume_test_$ts.txt")

    $jdContent = [System.Net.Http.StringContent]::new("Looking for a Python Developer who knows SQL")
    $resMultipart.Add($jdContent, "job_description")

    $resResp = $resClient.PostAsync("$baseUrl/resume/analyze", $resMultipart).Result
    $resRawBody = $resResp.Content.ReadAsStringAsync().Result
    $resParsed = $resRawBody | ConvertFrom-Json

    if ($resResp.IsSuccessStatusCode -and $resParsed.ats_score -gt 0) {
        Ok "Resume Analysis OK (ATS Score: $($resParsed.ats_score), Grade: $($resParsed.overall_grade))"
    } else {
        Fail "Resume Analysis failed HTTP $($resResp.StatusCode): $resRawBody"
    }
    $resClient.Dispose()
} catch { Fail "Resume Analyzer exception: $_" }

# ── 12. Delete document ───────────────────────────────────────────────────────
Section "12. Documents - Delete  [DELETE /api/documents/{id}]"
if ($docId) {
    try {
        $r = Invoke-RestMethod "$baseUrl/documents/$docId" -Method DELETE -Headers $headers
        Ok "Document deleted: $($r.message)"
    } catch { Fail "Delete doc failed: $_" }
} else { Write-Host "  [SKIP]" -ForegroundColor Yellow }

# ── 13. Delete chat ───────────────────────────────────────────────────────────
Section "13. Chat - Delete  [DELETE /api/chats/{id}]"
if ($chatId) {
    try {
        $r = Invoke-RestMethod "$baseUrl/chats/$chatId" -Method DELETE -Headers $headers
        Ok "Chat deleted: $($r.message)"
    } catch { Fail "Delete chat failed: $_" }
} else { Write-Host "  [SKIP]" -ForegroundColor Yellow }

# ── 14. Frontend ──────────────────────────────────────────────────────────────
Section "14. Frontend  [GET http://localhost:3000]"
try {
    $r = Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200) { Ok "Frontend reachable (HTTP 200)" }
    else { Fail "Frontend status: $($r.StatusCode)" }
} catch { Fail "Frontend unreachable: $_" }

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "           COMPREHENSIVE TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PASSED : $pass" -ForegroundColor Green
if ($fail -eq 0) {
    Write-Host "  FAILED : $fail" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  ALL TESTS PASSED - System fully functional!" -ForegroundColor Green
} else {
    Write-Host "  FAILED : $fail" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Some tests FAILED - review output above" -ForegroundColor Red
    exit 1
}
