#!/bin/bash

# Kill any existing servers
pkill -f "api-server.js" 2>/dev/null
sleep 2

# Start server
cd "/home/omar/claude - sales_auto_skill/mcp-server"
node src/api-server.js --port=3456 > /tmp/prototype-test.log 2>&1 &
SERVER_PID=$!
echo "Started server PID: $SERVER_PID"
sleep 5

echo ""
echo "===== PROTOTYPE POLLUTION TESTS ====="
echo ""

# Test 1: Normal request (should succeed)
echo "Test 1: Normal request (should succeed - 200)"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3456/health \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}')
echo "  HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  ✓ SUCCESS: Normal request accepted"
else
  echo "  ✗ FAIL: Normal request rejected"
fi
echo ""

# Test 2: Attempt with __proto__ (should be blocked - 400)
echo "Test 2: Request with __proto__ (should be blocked - 400)"
RESPONSE=$(curl -s \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"__proto__":{"isAdmin":true},"icpProfileName":"test"}')
HTTP_STATUS=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' || echo "HTTP 400")
echo "  Response: $RESPONSE" | head -3
if echo "$RESPONSE" | grep -q "Prototype pollution"; then
  echo "  ✓ SUCCESS: __proto__ blocked"
else
  echo "  ✗ FAIL: __proto__ not blocked"
fi
echo ""

# Test 3: Attempt with constructor (should be blocked - 400)
echo "Test 3: Request with 'constructor' (should be blocked - 400)"
RESPONSE=$(curl -s \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"constructor":{"prototype":{"isAdmin":true}},"icpProfileName":"test"}')
echo "  Response: $RESPONSE" | head -3
if echo "$RESPONSE" | grep -q "Prototype pollution"; then
  echo "  ✓ SUCCESS: constructor blocked"
else
  echo "  ✗ FAIL: constructor not blocked"
fi
echo ""

# Test 4: Attempt with prototype (should be blocked - 400)
echo "Test 4: Request with 'prototype' (should be blocked - 400)"
RESPONSE=$(curl -s \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"prototype":{"isAdmin":true},"icpProfileName":"test"}')
echo "  Response: $RESPONSE" | head -3
if echo "$RESPONSE" | grep -q "Prototype pollution"; then
  echo "  ✓ SUCCESS: prototype blocked"
else
  echo "  ✗ FAIL: prototype not blocked"
fi
echo ""

# Test 5: Nested pollution attempt (should be blocked - 400)
echo "Test 5: Nested pollution attempt (should be blocked - 400)"
RESPONSE=$(curl -s \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"data":{"nested":{"__proto__":{"isAdmin":true}}},"icpProfileName":"test"}')
echo "  Response: $RESPONSE" | head -3
if echo "$RESPONSE" | grep -q "Prototype pollution"; then
  echo "  ✓ SUCCESS: Nested __proto__ blocked"
else
  echo "  ✗ FAIL: Nested __proto__ not blocked"
fi
echo ""

echo "===== TESTS COMPLETE ====="
echo ""
echo "Server logs (last 10 lines):"
tail -10 /tmp/prototype-test.log
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null
sleep 1
echo "Server stopped"
