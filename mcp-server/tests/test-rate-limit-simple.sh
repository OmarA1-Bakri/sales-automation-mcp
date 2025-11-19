#!/bin/bash

# Kill any existing servers
pkill -f "api-server.js" 2>/dev/null
sleep 2

# Start server with LOW rate limit for testing (5 requests per minute)
cd "/home/omar/claude - sales_auto_skill/mcp-server"
RATE_LIMIT_MAX=5 RATE_LIMIT_WINDOW=1 node src/api-server.js --port=3456 > /tmp/rate-limit-test-simple.log 2>&1 &
SERVER_PID=$!
echo "Started server PID: $SERVER_PID (Rate Limit: 5 req/min)"
sleep 5

echo ""
echo "===== RATE LIMITING TESTS ====="
echo ""

# Test 1: Health endpoint should be exempt from rate limiting
echo "Test 1: Health endpoint (SHOULD NOT be rate limited - skip exemption)"
for i in {1..7}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/health)
  echo "  Request $i: HTTP $HTTP_STATUS"
done
echo ""

# Test 2: Dashboard endpoint within limit (no auth needed, subject to rate limit)
echo "Test 2: Dashboard endpoint WITHIN rate limit (should succeed)"
for i in {1..5}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/dashboard)
  echo "  Request $i: HTTP $HTTP_STATUS"
done
echo ""

# Test 3: Exceed rate limit
echo "Test 3: EXCEED rate limit (6th request should get 429)"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/dashboard)
RESPONSE=$(curl -s http://localhost:3456/dashboard)
echo "  Request 6: HTTP $HTTP_STATUS"
if [ "$HTTP_STATUS" = "429" ]; then
  echo "  ✓ SUCCESS: Rate limit enforced!"
  echo "  Response: $RESPONSE" | head -3
else
  echo "  ✗ FAIL: Expected 429, got $HTTP_STATUS"
fi
echo ""

# Test 4: Check RateLimit headers
echo "Test 4: Check RateLimit-* headers (on 7th request)"
curl -s -i http://localhost:3456/dashboard 2>&1 | grep -i "ratelimit"
echo ""

# Test 5: Wait for window reset and verify new window works
echo "Test 5: Verify rate limit window resets after 60 seconds"
echo "  Waiting 65 seconds for rate limit window to reset..."
sleep 65
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/dashboard)
echo "  First request after reset: HTTP $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "304" ]; then
  echo "  ✓ SUCCESS: Rate limit window reset correctly!"
else
  echo "  ✗ FAIL: Expected 200/304, got $HTTP_STATUS"
fi
echo ""

echo "===== TESTS COMPLETE ====="
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null
sleep 2
echo "Server stopped"
