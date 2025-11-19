#!/bin/bash

# Kill any existing servers
pkill -f "api-server.js" 2>/dev/null
sleep 2

# Start server with LOW rate limit for testing (5 requests per minute)
cd "/home/omar/claude - sales_auto_skill/mcp-server"
RATE_LIMIT_MAX=5 RATE_LIMIT_WINDOW=1 node src/api-server.js --port=3456 > /tmp/rate-limit-test.log 2>&1 &
SERVER_PID=$!
echo "Started server PID: $SERVER_PID (Rate Limit: 5 req/min)"
sleep 5

echo ""
echo "===== RATE LIMITING TESTS ====="
echo ""

# Test 1: Health endpoint should be exempt from rate limiting
echo "Test 1: Health endpoint (SHOULD NOT be rate limited)"
for i in {1..7}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/health)
  echo "  Request $i: HTTP $HTTP_STATUS"
done
echo ""

# Test 2: Protected endpoint within limit (with valid API key)
echo "Test 2: Protected endpoint WITHIN rate limit (should succeed)"
for i in {1..5}; do
  RESPONSE=$(curl -s -w "\n  HTTP Status: %{http_code}" \
    -X POST http://localhost:3456/api/discover \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
    -d '{"icpProfileName":"icp_test","count":10}')
  echo "  Request $i:"
  echo "$RESPONSE" | head -3
  echo ""
done

# Test 3: Exceed rate limit
echo "Test 3: EXCEED rate limit (should get 429)"
echo "  Request 6 (should be rate limited):"
RESPONSE=$(curl -s -w "\n  HTTP Status: %{http_code}" \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"icpProfileName":"icp_test","count":10}')
echo "$RESPONSE" | head -5
echo ""

# Test 4: Check RateLimit headers on normal request
echo "Test 4: Check RateLimit-* headers"
curl -s -i http://localhost:3456/api/discover \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"icpProfileName":"icp_test","count":10}' 2>&1 | grep -i "ratelimit"
echo ""

echo "===== TESTS COMPLETE ====="
echo ""
echo "Server logs:"
tail -20 /tmp/rate-limit-test.log
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null
echo "Server stopped"
