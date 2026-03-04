# ========================================
# JARVIS API ENDPOINT TESTING SUITE (PowerShell)
# Tests all 404 endpoints
# ========================================

$BASE_URL = "http://localhost:3000"
$SECURITY_URL = "http://localhost:3038"
$TOKEN = ""
$WEBHOOK_ID = ""
$AGENT_NAME = "Dialogue"

# Counters
$script:TOTAL_TESTS = 0
$script:PASSED_TESTS = 0
$script:FAILED_TESTS = 0

# Test result function
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Data = "",
        [int]$ExpectedStatus = 200,
        [string]$Description
    )
    
    $script:TOTAL_TESTS++
    
    Write-Host "`nTest $($script:TOTAL_TESTS): $Description" -ForegroundColor Yellow
    Write-Host "  Method: $Method"
    Write-Host "  URL: $Url"
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($TOKEN) {
        $headers["Authorization"] = "Bearer $TOKEN"
    }
    
    try {
        if ($Data) {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $Data -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing -ErrorAction Stop
        }
        
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  ✓ PASSED (Status: $statusCode)" -ForegroundColor Green
            $script:PASSED_TESTS++
            try {
                $json = $response.Content | ConvertFrom-Json
                Write-Host "  Response: $($json | ConvertTo-Json -Compress)"
            } catch {
                Write-Host "  Response: $($response.Content)"
            }
        } else {
            Write-Host "  ✗ FAILED (Expected: $ExpectedStatus, Got: $statusCode)" -ForegroundColor Red
            $script:FAILED_TESTS++
            Write-Host "  Response: $($response.Content)"
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  ✓ PASSED (Status: $statusCode)" -ForegroundColor Green
            $script:PASSED_TESTS++
        } else {
            Write-Host "  ✗ FAILED (Expected: $ExpectedStatus, Got: $statusCode)" -ForegroundColor Red
            $script:FAILED_TESTS++
            Write-Host "  Error: $($_.Exception.Message)"
        }
    }
}

Write-Host "========================================="
Write-Host "JARVIS API ENDPOINT TESTING SUITE"
Write-Host "========================================="
Write-Host "Started at: $(Get-Date)"
Write-Host ""

# ========================================
# GROUP 1: HEALTH & STATUS (10 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 1: HEALTH & STATUS ENDPOINTS (10)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$BASE_URL/health" -Description "Basic health check"
Test-Endpoint -Method "GET" -Url "$BASE_URL/ready" -Description "Readiness check"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/health/live" -Description "Liveness probe"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/health/ready" -Description "Readiness probe"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/health/metrics" -Description "Health metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/health/dependencies" -Description "Dependencies health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/health/detailed" -Description "Detailed health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/status" -Description "System status"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/ping" -Description "Ping endpoint"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/version" -Description "Version info"

# ========================================
# GROUP 2: AUTHENTICATION (15 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 2: AUTHENTICATION ENDPOINTS (15)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

# Register user
Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/register" `
    -Data '{"email":"test@jarvis.ai","password":"Test123456!","name":"Test User"}' `
    -ExpectedStatus 201 -Description "Register new user"

# Login
$loginBody = @{
    email = "test@jarvis.ai"
    password = "Test123456!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $loginBody
    $TOKEN = $loginResponse.data.accessToken
    $REFRESH_TOKEN = $loginResponse.data.refreshToken
} catch {
    Write-Host "  ⚠ Login failed, continuing without token" -ForegroundColor Yellow
}

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/login" `
    -Data $loginBody -Description "User login"

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/auth/me" -Description "Get current user"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/auth/check" -Description "Check authentication"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/auth/sessions" -Description "List sessions"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/auth/stats" -Description "Auth statistics"

if ($REFRESH_TOKEN) {
    Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/refresh" `
        -Data "{\"refreshToken\":\"$REFRESH_TOKEN\"}" -Description "Refresh token"
}

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/change-password" `
    -Data '{"currentPassword":"Test123456!","newPassword":"NewTest123456!"}' `
    -Description "Change password"

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/reset-password" `
    -Data '{"email":"test@jarvis.ai"}' -Description "Reset password request"

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/verify-email" `
    -Data '{"token":"test-token"}' -Description "Verify email"

if ($TOKEN) {
    Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/verify-token" `
        -Data "{\"token\":\"$TOKEN\"}" -Description "Verify token"
}

if ($REFRESH_TOKEN) {
    Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/revoke" `
        -Data "{\"refreshToken\":\"$REFRESH_TOKEN\"}" -Description "Revoke refresh token"
    
    Test-Endpoint -Method "POST" -Url "$BASE_URL/api/auth/logout" `
        -Data "{\"refreshToken\":\"$REFRESH_TOKEN\"}" -Description "User logout"
}

Test-Endpoint -Method "DELETE" -Url "$BASE_URL/api/auth/account" `
    -Data '{"password":"NewTest123456!"}' -Description "Delete account"

# Re-register and login for remaining tests
try {
    $adminBody = @{
        email = "admin@jarvis.ai"
        password = "Admin123456!"
        name = "Admin User"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method POST `
        -ContentType "application/json" -Body $adminBody | Out-Null
    
    $adminLoginBody = @{
        email = "admin@jarvis.ai"
        password = "Admin123456!"
    } | ConvertTo-Json
    
    $adminLoginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $adminLoginBody
    $TOKEN = $adminLoginResponse.data.accessToken
} catch {
    Write-Host "  ⚠ Admin registration/login failed" -ForegroundColor Yellow
}

# ========================================
# GROUP 3: AGENT MANAGEMENT (15 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 3: AGENT MANAGEMENT ENDPOINTS (15)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents" -Description "List all agents"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents?page=1&limit=10" -Description "List agents with pagination"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents?status=online" -Description "List online agents"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents/$AGENT_NAME" -Description "Get specific agent"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents/$AGENT_NAME/health" -Description "Get agent health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents/$AGENT_NAME/metrics" -Description "Get agent metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents/$AGENT_NAME/logs" -Description "Get agent logs"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/agents/$AGENT_NAME/config" -Description "Get agent config"

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/agents/$AGENT_NAME/execute" `
    -Data '{"action":"ping","inputs":{}}' -Description "Execute agent action"

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/agents/$AGENT_NAME/config" `
    -Data '{"setting":"value"}' -Description "Update agent config"

Test-Endpoint -Method "GET" -Url "$BASE_URL/agents/status" -Description "Legacy agent status"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/capabilities" -Description "System capabilities"
Test-Endpoint -Method "POST" -Url "$BASE_URL/chat" `
    -Data '{"message":"Hello","userId":"test-user"}' -Description "Chat endpoint"

# ========================================
# GROUP 4: SYSTEM MANAGEMENT (10 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 4: SYSTEM MANAGEMENT ENDPOINTS (10)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/system/info" -Description "System information"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/metrics" -Description "Prometheus metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/stats" -Description "System statistics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/features" -Description "Feature flags"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/environment" -Description "Environment info"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/config" -Description "System config"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/logs" -Description "System logs"

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/config" `
    -Data '{"setting":"value"}' -Description "Update system config"

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/logs?level=info&limit=10" -Description "Filtered logs"

# ========================================
# GROUP 5: BATCH OPERATIONS (5 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 5: BATCH OPERATIONS ENDPOINTS (5)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/batch/execute" `
    -Data '[{"agentId":"Dialogue","action":"ping","inputs":{}}]' -Description "Execute batch operations"

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/batch/status/batch-123" -Description "Get batch status"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/batch/history" -Description "Get batch history"
Test-Endpoint -Method "POST" -Url "$BASE_URL/api/batch/cancel/batch-123" -Description "Cancel batch"
Test-Endpoint -Method "DELETE" -Url "$BASE_URL/api/batch/batch-123" -Description "Delete batch"

# ========================================
# GROUP 6: SECURITY AGENT (25 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 6: SECURITY AGENT ENDPOINTS (25)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$SECURITY_URL/health" -Description "Security agent health"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/scan" `
    -Data '{"inputs":{"input":"Test input","userId":"test-user"}}' -Description "Scan input for threats"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/check-tool" `
    -Data '{"inputs":{"userId":"test-user","toolName":"send_email"}}' -Description "Check tool access"

Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/events" -Description "Get security events"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/events?limit=10" -Description "Get security events (limited)"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/threat-level?userId=test-user" -Description "Get user threat level"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/stats" -Description "Security statistics"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/stats/summary" -Description "Stats summary"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/stats/realtime" -Description "Realtime stats"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/stats/trends" -Description "Security trends"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/stats/export" -Description "Export stats"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/users/test-user" -Description "Get user security profile"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/users" -Description "List all users"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/users/test-user/block" `
    -Data '{"reason":"Testing"}' -Description "Block user"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/users/test-user/unblock" -Description "Unblock user"
Test-Endpoint -Method "DELETE" -Url "$SECURITY_URL/api/users/test-user" -Description "Delete user profile"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/rate-limits" -Description "Get rate limits"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/rate-limits?userId=test-user" -Description "Get user rate limits"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/rate-limits/test-user/send_email" -Description "Get specific rate limit"
Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/rate-limits/config" -Description "Get rate limit config"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/rate-limits/config" `
    -Data '{"toolName":"send_email","maxCalls":10,"windowMs":60000}' -Description "Update rate limit config"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/rate-limits/reset" `
    -Data '{"userId":"test-user"}' -Description "Reset rate limits"

Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/patterns" -Description "Get threat patterns"

Test-Endpoint -Method "POST" -Url "$SECURITY_URL/api/patterns" `
    -Data '{"type":"prompt_injection","pattern":"ignore instructions","severity":"high"}' -Description "Add threat pattern"

Test-Endpoint -Method "GET" -Url "$SECURITY_URL/api/redactions" -Description "Get redaction log"

# ========================================
# GROUP 7: HEALTH API (35 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 7: HEALTH API ENDPOINTS (35)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents" -Description "List all agent health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/$AGENT_NAME" -Description "Get specific agent health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/$AGENT_NAME/metrics" -Description "Get agent health metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/$AGENT_NAME/logs" -Description "Get agent health logs"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/$AGENT_NAME/config" -Description "Get agent health config"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/$AGENT_NAME/status" -Description "Get agent status"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/$AGENT_NAME/history" -Description "Get agent health history"

Test-Endpoint -Method "POST" -Url "$BASE_URL/health/agents/$AGENT_NAME/health-check" -Description "Trigger health check"

Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/summary" -Description "Agent health summary"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/list" -Description "List agent health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/agents/unhealthy" -Description "List unhealthy agents"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system" -Description "System health"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/uptime" -Description "System uptime"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/resources" -Description "System resources"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/alerts" -Description "System alerts"

Test-Endpoint -Method "POST" -Url "$BASE_URL/health/system/alerts" `
    -Data '{"title":"Test Alert","message":"Testing","severity":"info"}' -Description "Create system alert"

Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/reports" -Description "Health reports"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/status" -Description "System health status"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/dependencies" -Description "System dependencies"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/system/performance" -Description "System performance"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/metrics/live" -Description "Live metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/metrics/latest" -Description "Latest metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/metrics/history" -Description "Metrics history"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/metrics/summary" -Description "Metrics summary"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/metrics/export" -Description "Export metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/metrics/agents" -Description "Agent metrics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/health/incidents" -Description "List incidents"

Test-Endpoint -Method "POST" -Url "$BASE_URL/health/incidents" `
    -Data '{"title":"Test Incident","description":"Testing","severity":"low"}' -Description "Create incident"

Test-Endpoint -Method "GET" -Url "$BASE_URL/health/status" -Description "Health status"

# ========================================
# GROUP 8: ANALYTICS API (20 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 8: ANALYTICS API ENDPOINTS (20)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/overview" -Description "Analytics overview"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/agents" -Description "Agent analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/agents?period=7d" -Description "Agent analytics (7 days)"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/agents/$AGENT_NAME" -Description "Specific agent analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/requests" -Description "Request analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/requests?page=1&limit=10" -Description "Request analytics (paginated)"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/errors" -Description "Error analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/errors?agent=$AGENT_NAME" -Description "Agent error analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/performance" -Description "Performance analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/usage" -Description "Usage analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/users" -Description "User analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/security" -Description "Security analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/export" -Description "Export analytics (JSON)"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/export?format=csv" -Description "Export analytics (CSV)"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/reports" -Description "Analytics reports"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/real-time" -Description "Real-time analytics"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/trends" -Description "Analytics trends"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/comparison?period1=7d&period2=14d" -Description "Period comparison"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/dashboard" -Description "Analytics dashboard"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/analytics/health-score" -Description "System health score"

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/analytics/track" `
    -Data '{"agent":"Dialogue","action":"test","responseTime":100}' -Description "Track analytics event"

# ========================================
# GROUP 9: WEBHOOK API (10 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 9: WEBHOOK API ENDPOINTS (10)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/webhooks/events/list" -Description "List webhook events"

# Create webhook
try {
    $webhookBody = @{
        url = "https://webhook.site/test"
        events = @("agent.started", "request.completed")
        description = "Test webhook"
    } | ConvertTo-Json
    
    $webhookResponse = Invoke-RestMethod -Uri "$BASE_URL/api/webhooks" -Method POST `
        -ContentType "application/json" -Headers @{"Authorization" = "Bearer $TOKEN"} -Body $webhookBody
    $WEBHOOK_ID = $webhookResponse.data.id
} catch {
    Write-Host "  ⚠ Webhook creation failed" -ForegroundColor Yellow
}

Test-Endpoint -Method "POST" -Url "$BASE_URL/api/webhooks" `
    -Data '{"url":"https://webhook.site/test2","events":["agent.started"],"description":"Test webhook 2"}' `
    -ExpectedStatus 201 -Description "Create webhook"

Test-Endpoint -Method "GET" -Url "$BASE_URL/api/webhooks" -Description "List webhooks"
Test-Endpoint -Method "GET" -Url "$BASE_URL/api/webhooks?page=1&limit=10" -Description "List webhooks (paginated)"

if ($WEBHOOK_ID) {
    Test-Endpoint -Method "GET" -Url "$BASE_URL/api/webhooks/$WEBHOOK_ID" -Description "Get webhook details"
    
    Test-Endpoint -Method "PATCH" -Url "$BASE_URL/api/webhooks/$WEBHOOK_ID" `
        -Data '{"description":"Updated webhook"}' -Description "Update webhook"
    
    Test-Endpoint -Method "POST" -Url "$BASE_URL/api/webhooks/$WEBHOOK_ID/test" -Description "Test webhook"
    Test-Endpoint -Method "GET" -Url "$BASE_URL/api/webhooks/$WEBHOOK_ID/deliveries" -Description "Get webhook deliveries"
    
    Test-Endpoint -Method "DELETE" -Url "$BASE_URL/api/webhooks/$WEBHOOK_ID" -Description "Delete webhook"
}

# ========================================
# GROUP 10: INDIVIDUAL AGENT ENDPOINTS (7 per agent × 37 = 259 tests)
# ========================================
Write-Host "`n=========================================" -ForegroundColor Yellow
Write-Host "GROUP 10: INDIVIDUAL AGENT ENDPOINTS (259)" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

$AGENTS = @("Dialogue", "Web", "Knowledge", "Finance", "Calendar", "Email", "Code", "Voice", "Music", "Image", "Video", "Spotify", "AppleMusic", "Weather", "News", "Reminder", "Timer", "Alarm", "Story", "Calculator", "UnitConverter", "Translation", "Command", "Context", "Memory", "Emotion", "File", "ComputerControl", "LLM", "Personality", "Listening", "Speech", "VoiceCommand", "Reliability", "EmotionsEngine", "MemorySystem", "VisualEngine")

$PORTS = @(3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3015, 3016, 3017, 3018, 3019, 3020, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032, 3033, 3029, 3035, 3036, 3032, 3034, 3036, 3037)

for ($i = 0; $i -lt $AGENTS.Count; $i++) {
    $AGENT = $AGENTS[$i]
    $PORT = $PORTS[$i]
    $AGENT_URL = "http://localhost:$PORT"
    
    Write-Host "`nTesting $AGENT Agent (Port $PORT)" -ForegroundColor Yellow
    
    Test-Endpoint -Method "GET" -Url "$AGENT_URL/health" -Description "$AGENT - Health check"
    Test-Endpoint -Method "GET" -Url "$AGENT_URL/api/capabilities" -Description "$AGENT - Get capabilities"
    Test-Endpoint -Method "GET" -Url "$AGENT_URL/api/status" -Description "$AGENT - Get status"
    Test-Endpoint -Method "GET" -Url "$AGENT_URL/api/metrics" -Description "$AGENT - Get metrics"
    Test-Endpoint -Method "GET" -Url "$AGENT_URL/api/logs" -Description "$AGENT - Get logs"
    Test-Endpoint -Method "GET" -Url "$AGENT_URL/api/config" -Description "$AGENT - Get config"
}

# ========================================
# FINAL REPORT
# ========================================
Write-Host "`n========================================="
Write-Host "TEST SUITE COMPLETED"
Write-Host "========================================="
Write-Host "Completed at: $(Get-Date)"
Write-Host ""
Write-Host "Total Tests: $($script:TOTAL_TESTS)"
Write-Host "Passed: $($script:PASSED_TESTS)" -ForegroundColor Green
Write-Host "Failed: $($script:FAILED_TESTS)" -ForegroundColor Red
Write-Host ""

if ($script:FAILED_TESTS -eq 0) {
    Write-Host "✓ ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} else {
    $passRate = [math]::Round(($script:PASSED_TESTS / $script:TOTAL_TESTS) * 100, 2)
    Write-Host "Pass Rate: $passRate%" -ForegroundColor Yellow
    exit 1
}
