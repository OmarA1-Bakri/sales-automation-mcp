#!/bin/bash

echo "========================================="
echo "FINAL VALIDATION TESTS AFTER BUG FIXES"
echo "=========================================

"

# Test 1: Health
echo "TEST 1: Health Check"
curl -s http://localhost:3456/health
if curl -s http://localhost:3456/health | grep -q 'healthy'; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
fi
echo ""

# Test 2: Stats
echo "TEST 2: /stats endpoint"
curl -s http://localhost:3456/stats
if curl -s http://localhost:3456/stats | grep -q 'success'; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
fi
echo ""

# Test 3: Jobs list
echo "TEST 3: /api/jobs"
curl -s http://localhost:3456/api/jobs
if curl -s http://localhost:3456/api/jobs | grep -q 'success'; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
fi
echo ""

# Test 4: Create job
echo "TEST 4: Create Discovery Job"
RESPONSE=$(curl -s -X POST http://localhost:3456/api/discover -H "Content-Type: application/json" -d '{"query":"test","count":5}')
echo "$RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ PASS - Job creation works!"
else
  echo "❌ FAIL - Job creation failed"
fi
echo ""

# Test 5: Verify job in list
echo "TEST 5: Verify job appears in list"
sleep 1
curl -s http://localhost:3456/api/jobs
if curl -s http://localhost:3456/api/jobs | grep -q '"type":"discover"'; then
  echo "✅ PASS - Job found in database"
else
  echo "❌ FAIL - Job not in database"
fi
echo ""

echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
