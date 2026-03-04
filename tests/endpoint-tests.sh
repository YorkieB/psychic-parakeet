#!/bin/bash

# ========================================
# JARVIS API ENDPOINT TESTING SUITE
# Tests all 404 endpoints
# ========================================

BASE_URL="http://localhost:3000"
SECURITY_URL="http://localhost:3038"
TOKEN=""
WEBHOOK_ID=""
AGENT_NAME="Dialogue"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result function
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${YELLOW}Test $TOTAL_TESTS: $description${NC}"
    echo "  Method: $method"
    echo "  URL: $url"
    
    if [ -n "$data" ]; then
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
                -H "Authorization: Bearer $TOKEN")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$url")
        fi
    fi
    
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASSED${NC} (Status: $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "  Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body)"
    else
        echo -e "  ${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  Response: $body"
    fi
}

echo "========================================="
echo "JARVIS API ENDPOINT TESTING SUITE"
echo "========================================="
echo "Started at: $(date)"
echo ""

# ========================================
# GROUP 1: HEALTH & STATUS (10 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 1: HEALTH & STATUS ENDPOINTS (10)"
echo "=========================================${NC}"

test_endpoint "GET" "$BASE_URL/health" "" 200 "Basic health check"
test_endpoint "GET" "$BASE_URL/ready" "" 200 "Readiness check"
test_endpoint "GET" "$BASE_URL/api/health/live" "" 200 "Liveness probe"
test_endpoint "GET" "$BASE_URL/api/health/ready" "" 200 "Readiness probe"
test_endpoint "GET" "$BASE_URL/api/health/metrics" "" 200 "Health metrics"
test_endpoint "GET" "$BASE_URL/api/health/dependencies" "" 200 "Dependencies health"
test_endpoint "GET" "$BASE_URL/api/health/detailed" "" 200 "Detailed health"
test_endpoint "GET" "$BASE_URL/api/status" "" 200 "System status"
test_endpoint "GET" "$BASE_URL/api/ping" "" 200 "Ping endpoint"
test_endpoint "GET" "$BASE_URL/api/version" "" 200 "Version info"

# ========================================
# GROUP 2: AUTHENTICATION (15 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 2: AUTHENTICATION ENDPOINTS (15)"
echo "=========================================${NC}"

# Register user
test_endpoint "POST" "$BASE_URL/api/auth/register" \
    '{"email":"test@jarvis.ai","password":"Test123456!","name":"Test User"}' \
    201 "Register new user"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@jarvis.ai","password":"Test123456!"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

test_endpoint "POST" "$BASE_URL/api/auth/login" \
    '{"email":"test@jarvis.ai","password":"Test123456!"}' \
    200 "User login"

test_endpoint "GET" "$BASE_URL/api/auth/me" "" 200 "Get current user"
test_endpoint "GET" "$BASE_URL/api/auth/check" "" 200 "Check authentication"
test_endpoint "GET" "$BASE_URL/api/auth/sessions" "" 200 "List sessions"
test_endpoint "GET" "$BASE_URL/api/auth/stats" "" 200 "Auth statistics"

test_endpoint "POST" "$BASE_URL/api/auth/refresh" \
    "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    200 "Refresh token"

test_endpoint "POST" "$BASE_URL/api/auth/change-password" \
    '{"currentPassword":"Test123456!","newPassword":"NewTest123456!"}' \
    200 "Change password"

test_endpoint "POST" "$BASE_URL/api/auth/reset-password" \
    '{"email":"test@jarvis.ai"}' \
    200 "Reset password request"

test_endpoint "POST" "$BASE_URL/api/auth/verify-email" \
    '{"token":"test-token"}' \
    200 "Verify email"

test_endpoint "POST" "$BASE_URL/api/auth/verify-token" \
    "{\"token\":\"$TOKEN\"}" \
    200 "Verify token"

test_endpoint "POST" "$BASE_URL/api/auth/revoke" \
    "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    200 "Revoke refresh token"

test_endpoint "POST" "$BASE_URL/api/auth/logout" \
    "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    200 "User logout"

test_endpoint "DELETE" "$BASE_URL/api/auth/account" \
    '{"password":"NewTest123456!"}' \
    200 "Delete account"

# Re-register and login for remaining tests
curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@jarvis.ai","password":"Admin123456!","name":"Admin User"}' > /dev/null

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@jarvis.ai","password":"Admin123456!"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

# ========================================
# GROUP 3: AGENT MANAGEMENT (15 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 3: AGENT MANAGEMENT ENDPOINTS (15)"
echo "=========================================${NC}"

test_endpoint "GET" "$BASE_URL/api/agents" "" 200 "List all agents"
test_endpoint "GET" "$BASE_URL/api/agents?page=1&limit=10" "" 200 "List agents with pagination"
test_endpoint "GET" "$BASE_URL/api/agents?status=online" "" 200 "List online agents"
test_endpoint "GET" "$BASE_URL/api/agents/$AGENT_NAME" "" 200 "Get specific agent"
test_endpoint "GET" "$BASE_URL/api/agents/$AGENT_NAME/health" "" 200 "Get agent health"
test_endpoint "GET" "$BASE_URL/api/agents/$AGENT_NAME/metrics" "" 200 "Get agent metrics"
test_endpoint "GET" "$BASE_URL/api/agents/$AGENT_NAME/logs" "" 200 "Get agent logs"
test_endpoint "GET" "$BASE_URL/api/agents/$AGENT_NAME/config" "" 200 "Get agent config"

test_endpoint "POST" "$BASE_URL/api/agents/$AGENT_NAME/execute" \
    '{"action":"ping","inputs":{}}' \
    200 "Execute agent action"

test_endpoint "POST" "$BASE_URL/api/agents/$AGENT_NAME/config" \
    '{"setting":"value"}' \
    200 "Update agent config"

test_endpoint "GET" "$BASE_URL/agents/status" "" 200 "Legacy agent status"
test_endpoint "GET" "$BASE_URL/api/capabilities" "" 200 "System capabilities"
test_endpoint "POST" "$BASE_URL/chat" \
    '{"message":"Hello","userId":"test-user"}' \
    200 "Chat endpoint"

# Admin-only endpoints (skip if not admin)
# test_endpoint "POST" "$BASE_URL/api/agents/$AGENT_NAME/restart" "" 200 "Restart agent"
# test_endpoint "POST" "$BASE_URL/api/agents/$AGENT_NAME/stop" "" 200 "Stop agent"

# ========================================
# GROUP 4: SYSTEM MANAGEMENT (10 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 4: SYSTEM MANAGEMENT ENDPOINTS (10)"
echo "=========================================${NC}"

test_endpoint "GET" "$BASE_URL/api/system/info" "" 200 "System information"
test_endpoint "GET" "$BASE_URL/api/metrics" "" 200 "Prometheus metrics"
test_endpoint "GET" "$BASE_URL/api/stats" "" 200 "System statistics"
test_endpoint "GET" "$BASE_URL/api/features" "" 200 "Feature flags"
test_endpoint "GET" "$BASE_URL/api/environment" "" 200 "Environment info"
test_endpoint "GET" "$BASE_URL/api/config" "" 200 "System config"
test_endpoint "GET" "$BASE_URL/api/logs" "" 200 "System logs"

test_endpoint "POST" "$BASE_URL/api/config" \
    '{"setting":"value"}' \
    200 "Update system config"

test_endpoint "GET" "$BASE_URL/api/logs?level=info&limit=10" "" 200 "Filtered logs"
# test_endpoint "POST" "$BASE_URL/api/restart" "" 200 "Restart system" # Skip - would restart server

# ========================================
# GROUP 5: BATCH OPERATIONS (5 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 5: BATCH OPERATIONS ENDPOINTS (5)"
echo "=========================================${NC}"

test_endpoint "POST" "$BASE_URL/api/batch/execute" \
    '[{"agentId":"Dialogue","action":"ping","inputs":{}}]' \
    200 "Execute batch operations"

test_endpoint "GET" "$BASE_URL/api/batch/status/batch-123" "" 200 "Get batch status"
test_endpoint "GET" "$BASE_URL/api/batch/history" "" 200 "Get batch history"
test_endpoint "POST" "$BASE_URL/api/batch/cancel/batch-123" "" 200 "Cancel batch"
test_endpoint "DELETE" "$BASE_URL/api/batch/batch-123" "" 200 "Delete batch"

# ========================================
# GROUP 6: SECURITY AGENT (25 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 6: SECURITY AGENT ENDPOINTS (25)"
echo "=========================================${NC}"

test_endpoint "GET" "$SECURITY_URL/health" "" 200 "Security agent health"

test_endpoint "POST" "$SECURITY_URL/api/scan" \
    '{"inputs":{"input":"Test input","userId":"test-user"}}' \
    200 "Scan input for threats"

test_endpoint "POST" "$SECURITY_URL/api/check-tool" \
    '{"inputs":{"userId":"test-user","toolName":"send_email"}}' \
    200 "Check tool access"

test_endpoint "GET" "$SECURITY_URL/api/events" "" 200 "Get security events"
test_endpoint "GET" "$SECURITY_URL/api/events?limit=10" "" 200 "Get security events (limited)"
test_endpoint "GET" "$SECURITY_URL/api/threat-level?userId=test-user" "" 200 "Get user threat level"
test_endpoint "GET" "$SECURITY_URL/api/stats" "" 200 "Security statistics"
test_endpoint "GET" "$SECURITY_URL/api/stats/summary" "" 200 "Stats summary"
test_endpoint "GET" "$SECURITY_URL/api/stats/realtime" "" 200 "Realtime stats"
test_endpoint "GET" "$SECURITY_URL/api/stats/trends" "" 200 "Security trends"
test_endpoint "GET" "$SECURITY_URL/api/stats/export" "" 200 "Export stats"
test_endpoint "GET" "$SECURITY_URL/api/users/test-user" "" 200 "Get user security profile"
test_endpoint "GET" "$SECURITY_URL/api/users" "" 200 "List all users"

test_endpoint "POST" "$SECURITY_URL/api/users/test-user/block" \
    '{"reason":"Testing"}' \
    200 "Block user"

test_endpoint "POST" "$SECURITY_URL/api/users/test-user/unblock" "" 200 "Unblock user"
test_endpoint "DELETE" "$SECURITY_URL/api/users/test-user" "" 200 "Delete user profile"
test_endpoint "GET" "$SECURITY_URL/api/rate-limits" "" 200 "Get rate limits"
test_endpoint "GET" "$SECURITY_URL/api/rate-limits?userId=test-user" "" 200 "Get user rate limits"
test_endpoint "GET" "$SECURITY_URL/api/rate-limits/test-user/send_email" "" 200 "Get specific rate limit"
test_endpoint "GET" "$SECURITY_URL/api/rate-limits/config" "" 200 "Get rate limit config"

test_endpoint "POST" "$SECURITY_URL/api/rate-limits/config" \
    '{"toolName":"send_email","maxCalls":10,"windowMs":60000}' \
    200 "Update rate limit config"

test_endpoint "POST" "$SECURITY_URL/api/rate-limits/reset" \
    '{"userId":"test-user"}' \
    200 "Reset rate limits"

test_endpoint "GET" "$SECURITY_URL/api/patterns" "" 200 "Get threat patterns"

test_endpoint "POST" "$SECURITY_URL/api/patterns" \
    '{"type":"prompt_injection","pattern":"ignore instructions","severity":"high"}' \
    200 "Add threat pattern"

test_endpoint "GET" "$SECURITY_URL/api/redactions" "" 200 "Get redaction log"

# ========================================
# GROUP 7: HEALTH API (35 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 7: HEALTH API ENDPOINTS (35)"
echo "=========================================${NC}"

test_endpoint "GET" "$BASE_URL/health/agents" "" 200 "List all agent health"
test_endpoint "GET" "$BASE_URL/health/agents/$AGENT_NAME" "" 200 "Get specific agent health"
test_endpoint "GET" "$BASE_URL/health/agents/$AGENT_NAME/metrics" "" 200 "Get agent health metrics"
test_endpoint "GET" "$BASE_URL/health/agents/$AGENT_NAME/logs" "" 200 "Get agent health logs"
test_endpoint "GET" "$BASE_URL/health/agents/$AGENT_NAME/config" "" 200 "Get agent health config"
test_endpoint "GET" "$BASE_URL/health/agents/$AGENT_NAME/status" "" 200 "Get agent status"
test_endpoint "GET" "$BASE_URL/health/agents/$AGENT_NAME/history" "" 200 "Get agent health history"

test_endpoint "POST" "$BASE_URL/health/agents/$AGENT_NAME/health-check" "" 200 "Trigger health check"

test_endpoint "GET" "$BASE_URL/health/agents/summary" "" 200 "Agent health summary"
test_endpoint "GET" "$BASE_URL/health/agents/list" "" 200 "List agent health"
test_endpoint "GET" "$BASE_URL/health/agents/unhealthy" "" 200 "List unhealthy agents"
test_endpoint "GET" "$BASE_URL/health/system" "" 200 "System health"
test_endpoint "GET" "$BASE_URL/health/system/uptime" "" 200 "System uptime"
test_endpoint "GET" "$BASE_URL/health/system/resources" "" 200 "System resources"
test_endpoint "GET" "$BASE_URL/health/system/alerts" "" 200 "System alerts"

test_endpoint "POST" "$BASE_URL/health/system/alerts" \
    '{"title":"Test Alert","message":"Testing","severity":"info"}' \
    200 "Create system alert"

test_endpoint "GET" "$BASE_URL/health/system/reports" "" 200 "Health reports"
test_endpoint "GET" "$BASE_URL/health/system/status" "" 200 "System health status"
test_endpoint "GET" "$BASE_URL/health/system/dependencies" "" 200 "System dependencies"
test_endpoint "GET" "$BASE_URL/health/system/performance" "" 200 "System performance"
test_endpoint "GET" "$BASE_URL/health/metrics/live" "" 200 "Live metrics"
test_endpoint "GET" "$BASE_URL/health/metrics/latest" "" 200 "Latest metrics"
test_endpoint "GET" "$BASE_URL/health/metrics/history" "" 200 "Metrics history"
test_endpoint "GET" "$BASE_URL/health/metrics/summary" "" 200 "Metrics summary"
test_endpoint "GET" "$BASE_URL/health/metrics/export" "" 200 "Export metrics"
test_endpoint "GET" "$BASE_URL/health/metrics/agents" "" 200 "Agent metrics"
test_endpoint "GET" "$BASE_URL/health/incidents" "" 200 "List incidents"

test_endpoint "POST" "$BASE_URL/health/incidents" \
    '{"title":"Test Incident","description":"Testing","severity":"low"}' \
    200 "Create incident"

test_endpoint "GET" "$BASE_URL/health/status" "" 200 "Health status"

# Admin-only (skip)
# test_endpoint "POST" "$BASE_URL/health/agents/$AGENT_NAME/respawn" '{"trigger":"test"}' 200 "Respawn agent"
# test_endpoint "POST" "$BASE_URL/health/agents/$AGENT_NAME/kill" "" 200 "Kill agent"
# test_endpoint "POST" "$BASE_URL/health/agents/$AGENT_NAME/restart" "" 200 "Restart agent"
# test_endpoint "POST" "$BASE_URL/health/agents/restart-all" "" 200 "Restart all agents"
# test_endpoint "DELETE" "$BASE_URL/health/system/alerts/alert-123" "" 200 "Resolve alert"
# test_endpoint "PATCH" "$BASE_URL/health/incidents/incident-123" '{"status":"resolved"}' 200 "Update incident"

# ========================================
# GROUP 8: ANALYTICS API (20 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 8: ANALYTICS API ENDPOINTS (20)"
echo "=========================================${NC}"

test_endpoint "GET" "$BASE_URL/api/analytics/overview" "" 200 "Analytics overview"
test_endpoint "GET" "$BASE_URL/api/analytics/agents" "" 200 "Agent analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/agents?period=7d" "" 200 "Agent analytics (7 days)"
test_endpoint "GET" "$BASE_URL/api/analytics/agents/$AGENT_NAME" "" 200 "Specific agent analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/requests" "" 200 "Request analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/requests?page=1&limit=10" "" 200 "Request analytics (paginated)"
test_endpoint "GET" "$BASE_URL/api/analytics/errors" "" 200 "Error analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/errors?agent=$AGENT_NAME" "" 200 "Agent error analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/performance" "" 200 "Performance analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/usage" "" 200 "Usage analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/users" "" 200 "User analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/security" "" 200 "Security analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/export" "" 200 "Export analytics (JSON)"
test_endpoint "GET" "$BASE_URL/api/analytics/export?format=csv" "" 200 "Export analytics (CSV)"
test_endpoint "GET" "$BASE_URL/api/analytics/reports" "" 200 "Analytics reports"
test_endpoint "GET" "$BASE_URL/api/analytics/real-time" "" 200 "Real-time analytics"
test_endpoint "GET" "$BASE_URL/api/analytics/trends" "" 200 "Analytics trends"
test_endpoint "GET" "$BASE_URL/api/analytics/comparison?period1=7d&period2=14d" "" 200 "Period comparison"
test_endpoint "GET" "$BASE_URL/api/analytics/dashboard" "" 200 "Analytics dashboard"
test_endpoint "GET" "$BASE_URL/api/analytics/health-score" "" 200 "System health score"

# Test tracking endpoint
test_endpoint "POST" "$BASE_URL/api/analytics/track" \
    '{"agent":"Dialogue","action":"test","responseTime":100}' \
    200 "Track analytics event"

# ========================================
# GROUP 9: WEBHOOK API (10 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 9: WEBHOOK API ENDPOINTS (10)"
echo "=========================================${NC}"

test_endpoint "GET" "$BASE_URL/api/webhooks/events/list" "" 200 "List webhook events"

# Create webhook
WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"url":"https://webhook.site/test","events":["agent.started","request.completed"],"description":"Test webhook"}')

WEBHOOK_ID=$(echo $WEBHOOK_RESPONSE | jq -r '.data.id')

test_endpoint "POST" "$BASE_URL/api/webhooks" \
    '{"url":"https://webhook.site/test2","events":["agent.started"],"description":"Test webhook 2"}' \
    201 "Create webhook"

test_endpoint "GET" "$BASE_URL/api/webhooks" "" 200 "List webhooks"
test_endpoint "GET" "$BASE_URL/api/webhooks?page=1&limit=10" "" 200 "List webhooks (paginated)"
test_endpoint "GET" "$BASE_URL/api/webhooks/$WEBHOOK_ID" "" 200 "Get webhook details"

test_endpoint "PATCH" "$BASE_URL/api/webhooks/$WEBHOOK_ID" \
    '{"description":"Updated webhook"}' \
    200 "Update webhook"

test_endpoint "POST" "$BASE_URL/api/webhooks/$WEBHOOK_ID/test" "" 200 "Test webhook"
test_endpoint "GET" "$BASE_URL/api/webhooks/$WEBHOOK_ID/deliveries" "" 200 "Get webhook deliveries"

# Delete webhook
test_endpoint "DELETE" "$BASE_URL/api/webhooks/$WEBHOOK_ID" "" 200 "Delete webhook"

# ========================================
# GROUP 10: INDIVIDUAL AGENT ENDPOINTS (7 per agent × 37 = 259 tests)
# ========================================
echo -e "\n${YELLOW}========================================="
echo "GROUP 10: INDIVIDUAL AGENT ENDPOINTS (259)"
echo "=========================================${NC}"

AGENTS=("Dialogue" "Web" "Knowledge" "Finance" "Calendar" "Email" "Code" "Voice" "Music" "Image" "Video" "Spotify" "AppleMusic" "Weather" "News" "Reminder" "Timer" "Alarm" "Story" "Calculator" "UnitConverter" "Translation" "Command" "Context" "Memory" "Emotion" "File" "ComputerControl" "LLM" "Personality" "Listening" "Speech" "VoiceCommand" "Reliability" "EmotionsEngine" "MemorySystem" "VisualEngine")

PORTS=(3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3015 3016 3017 3018 3019 3020 3023 3024 3025 3026 3027 3028 3029 3030 3031 3032 3033 3029 3035 3036 3032 3034 3036 3037)

for i in "${!AGENTS[@]}"; do
    AGENT="${AGENTS[$i]}"
    PORT="${PORTS[$i]}"
    AGENT_URL="http://localhost:$PORT"
    
    echo -e "\n${YELLOW}Testing $AGENT Agent (Port $PORT)${NC}"
    
    test_endpoint "GET" "$AGENT_URL/health" "" 200 "$AGENT - Health check"
    test_endpoint "GET" "$AGENT_URL/api/capabilities" "" 200 "$AGENT - Get capabilities"
    test_endpoint "GET" "$AGENT_URL/api/status" "" 200 "$AGENT - Get status"
    test_endpoint "GET" "$AGENT_URL/api/metrics" "" 200 "$AGENT - Get metrics"
    test_endpoint "GET" "$AGENT_URL/api/logs" "" 200 "$AGENT - Get logs"
    test_endpoint "GET" "$AGENT_URL/api/config" "" 200 "$AGENT - Get config"
    
    # Skip restart for automated testing
    # test_endpoint "POST" "$AGENT_URL/api/restart" "" 200 "$AGENT - Restart agent"
done

# ========================================
# FINAL REPORT
# ========================================
echo -e "\n========================================="
echo "TEST SUITE COMPLETED"
echo "========================================="
echo "Completed at: $(date)"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    PASS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
    echo -e "${YELLOW}Pass Rate: $PASS_RATE%${NC}"
    exit 1
fi
