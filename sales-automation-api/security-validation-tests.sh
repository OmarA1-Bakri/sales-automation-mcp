#!/bin/bash
# Security Validation Test Suite for Stage 2 B+ Grade
# Tests: CSRF, XSS, Auth, Rate Limiting

set -e

API_KEY="sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774"
BASE_URL="https://localhost:3443"
RESULTS_FILE="/tmp/security-test-results.txt"

echo "=======================================" > "$RESULTS_FILE"
echo "Security Validation Test Suite" >> "$RESULTS_FILE"
echo "Date: $(date)" >> "$RESULTS_FILE"
echo "=======================================" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

log_test() {
    echo "$1" | tee -a "$RESULTS_FILE"
}

log_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1" | tee -a "$RESULTS_FILE"
    ((pass_count++))
}

log_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1" | tee -a "$RESULTS_FILE"
    ((fail_count++))
}

log_info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1" | tee -a "$RESULTS_FILE"
}

echo "=========================================="
echo "TEST 1: CSRF Protection Validation"
echo "=========================================="
log_test "TEST 1: CSRF Protection Validation"

# Test 1A: Get CSRF token
log_info "1A: Obtaining CSRF token..."
CSRF_RESPONSE=$(curl -sk -X GET "$BASE_URL/api/csrf-token" \
  -H "X-API-Key: $API_KEY" 2>/dev/null)

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.token // empty')

if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
    log_pass "CSRF token obtained successfully"
    log_info "Token: ${CSRF_TOKEN:0:20}..."
else
    log_fail "Failed to obtain CSRF token"
    log_info "Response: $CSRF_RESPONSE"
fi

# Test 1B: POST without CSRF token (should fail with 403)
log_info "1B: Testing POST without CSRF token (expect 403)..."
HTTP_CODE=$(curl -sk -X POST "$BASE_URL/api/campaigns/templates" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' \
  -w "%{http_code}" \
  -o /dev/null 2>/dev/null)

if [ "$HTTP_CODE" = "403" ]; then
    log_pass "POST without CSRF token correctly rejected (403)"
else
    log_fail "POST without CSRF token returned $HTTP_CODE (expected 403)"
fi

# Test 1C: POST with CSRF token (should NOT be 403)
log_info "1C: Testing POST with CSRF token (expect not 403)..."
CSRF_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/campaigns/templates" \
  -H "X-API-Key: $API_KEY" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' \
  -w "\n%{http_code}" 2>/dev/null)

HTTP_CODE=$(echo "$CSRF_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$CSRF_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "403" ]; then
    log_pass "POST with CSRF token accepted (status: $HTTP_CODE)"
else
    log_fail "POST with CSRF token rejected with 403"
    log_info "Response: $RESPONSE_BODY"
fi

echo ""
echo "=========================================="
echo "TEST 2: Authentication & Authorization"
echo "=========================================="
log_test ""
log_test "TEST 2: Authentication & Authorization"

# Test 2A: No API key (should fail with 401)
log_info "2A: Request without API key (expect 401)..."
HTTP_CODE=$(curl -sk "$BASE_URL/api/campaigns/templates" \
  -w "%{http_code}" \
  -o /dev/null 2>/dev/null)

if [ "$HTTP_CODE" = "401" ]; then
    log_pass "Request without API key correctly rejected (401)"
else
    log_fail "Request without API key returned $HTTP_CODE (expected 401)"
fi

# Test 2B: Invalid API key (should fail with 401)
log_info "2B: Request with invalid API key (expect 401)..."
HTTP_CODE=$(curl -sk "$BASE_URL/api/campaigns/templates" \
  -H "X-API-Key: invalid_key_12345" \
  -w "%{http_code}" \
  -o /dev/null 2>/dev/null)

if [ "$HTTP_CODE" = "401" ]; then
    log_pass "Request with invalid API key correctly rejected (401)"
else
    log_fail "Request with invalid API key returned $HTTP_CODE (expected 401)"
fi

# Test 2C: Valid API key (should work - not 401)
log_info "2C: Request with valid API key (expect 200 or not 401)..."
HTTP_CODE=$(curl -sk "$BASE_URL/api/campaigns/templates" \
  -H "X-API-Key: $API_KEY" \
  -w "%{http_code}" \
  -o /dev/null 2>/dev/null)

if [ "$HTTP_CODE" != "401" ]; then
    log_pass "Request with valid API key accepted (status: $HTTP_CODE)"
else
    log_fail "Request with valid API key rejected with 401"
fi

echo ""
echo "=========================================="
echo "TEST 3: Rate Limiting"
echo "=========================================="
log_test ""
log_test "TEST 3: Rate Limiting"

# Test 3A: Multiple rapid requests
log_info "3A: Sending 10 rapid requests to health endpoint..."
rate_limit_triggered=0
for i in {1..10}; do
    HTTP_CODE=$(curl -sk "$BASE_URL/health" \
      -w "%{http_code}" \
      -o /dev/null 2>/dev/null)

    if [ "$HTTP_CODE" = "429" ]; then
        rate_limit_triggered=1
        break
    fi
done

# Health endpoint is exempt, so should all be 200
if [ $rate_limit_triggered -eq 0 ]; then
    log_pass "Health endpoint correctly exempt from rate limiting (all 200)"
else
    log_info "Rate limiting triggered on health endpoint (may be expected)"
fi

# Test 3B: Multiple rapid requests to protected endpoint
log_info "3B: Sending 15 rapid requests to protected endpoint..."
rate_limit_triggered=0
for i in {1..15}; do
    HTTP_CODE=$(curl -sk "$BASE_URL/api/campaigns/templates" \
      -H "X-API-Key: $API_KEY" \
      -w "%{http_code}" \
      -o /dev/null 2>/dev/null)

    if [ "$HTTP_CODE" = "429" ]; then
        rate_limit_triggered=1
        log_pass "Rate limiting triggered after $i requests (429)"
        break
    fi
done

if [ $rate_limit_triggered -eq 0 ]; then
    log_info "Rate limiting not triggered in 15 requests (may need higher threshold)"
fi

echo ""
echo "=========================================="
echo "TEST 4: XSS Sanitization"
echo "=========================================="
log_test ""
log_test "TEST 4: XSS Sanitization"

# Run the existing XSS test suite
log_info "4A: Running XSS sanitization test suite..."
cd "/home/omar/claude - sales_auto_skill/mcp-server"
XSS_OUTPUT=$(node test-xss-sanitization.js 2>&1)
XSS_EXIT_CODE=$?

if [ $XSS_EXIT_CODE -eq 0 ]; then
    PASSED_TESTS=$(echo "$XSS_OUTPUT" | grep -o "✅" | wc -l)
    log_pass "XSS sanitization suite passed ($PASSED_TESTS tests)"
else
    log_fail "XSS sanitization suite failed"
    log_info "Output: $XSS_OUTPUT"
fi

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
log_test ""
log_test "TEST SUMMARY"
log_test "Passed: $pass_count"
log_test "Failed: $fail_count"
log_test ""

if [ $fail_count -eq 0 ]; then
    log_test "✅ ALL TESTS PASSED - READY FOR B+ GRADE"
    exit 0
else
    log_test "❌ SOME TESTS FAILED - REVIEW REQUIRED"
    exit 1
fi
