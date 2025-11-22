#!/bin/bash

# Kill any existing servers
pkill -f "api-server.js" 2>/dev/null
sleep 2

# Start server
cd "/home/omar/claude - sales_auto_skill/mcp-server"
node src/api-server.js --port=3456 > /tmp/auth-test-final.log 2>&1 &
SERVER_PID=$!
echo "Started server PID: $SERVER_PID"
sleep 5

echo ""
echo "===== AUTHENTICATION TESTS ====="
echo ""

# Test 1: Public endpoint (should work - 200)
echo "Test 1: Public endpoint /health (no auth required)"
curl -s -w "\n  HTTP Status: %{http_code}\n" http://localhost:3456/health | head -2
echo ""

# Test 2: Protected endpoint without auth (should fail - 401)
echo "Test 2: Protected endpoint WITHOUT API key (should reject)"
curl -s -w "\n  HTTP Status: %{http_code}\n" \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -d '{"icpProfileName":"icp_test","count":10}' | head -2
echo ""

# Test 3: Protected endpoint with invalid key (should fail - 401)
echo "Test 3: Protected endpoint with INVALID API key (should reject)"
curl -s -w "\n  HTTP Status: %{http_code}\n" \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_fake_invalid_key" \
  -d '{"icpProfileName":"icp_test","count":10}' | head -2
echo ""

# Test 4: Protected endpoint with valid key via Bearer (should work - 200)
echo "Test 4: Protected endpoint with VALID API key (Bearer)"
curl -s -w "\n  HTTP Status: %{http_code}\n" \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774" \
  -d '{"icpProfileName":"icp_test","count":10}' | head -2
echo ""

# Test 5: Protected endpoint with valid key via X-API-Key (should work - 200)
echo "Test 5: Protected endpoint with VALID API key (X-API-Key header)"
curl -s -w "\n  HTTP Status: %{http_code}\n" \
  -X POST http://localhost:3456/api/discover \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_932a6e331c43b36ad6f13e5b1f50be96a90de4823b824ce0dca9b25ea03c6ccd" \
  -d '{"icpProfileName":"icp_test","count":10}' | head -2
echo ""

echo "===== TESTS COMPLETE ====="
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null
echo "Server stopped"
