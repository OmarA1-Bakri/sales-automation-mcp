#!/usr/bin/env node

/**
 * CORS Security Test Suite
 * Tests the CORS vulnerability fix (T2.7)
 *
 * Expected Behavior:
 * - Valid origins: 200/204 response
 * - Invalid origins: 403 Forbidden (NOT 500 Internal Server Error)
 * - No origin header: 200/204 (allows server-to-server calls)
 */

import http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const HOST = API_URL.replace('http://', '').replace('https://', '').split(':')[0];
const PORT = parseInt(API_URL.split(':')[2] || '3000');

// Test cases
const tests = [
  {
    name: 'Valid localhost origin (development)',
    origin: 'http://localhost:3456',
    expectedStatus: [200, 204, 401], // 401 = no API key (expected), but CORS passed
    shouldPass: true
  },
  {
    name: 'Valid allowed origin',
    origin: 'http://localhost:3000',
    expectedStatus: [200, 204, 401],
    shouldPass: true
  },
  {
    name: 'Invalid malicious origin',
    origin: 'http://evil.com',
    expectedStatus: [403], // Should be rejected with 403, NOT 500
    shouldPass: false
  },
  {
    name: 'Invalid XSS attempt',
    origin: 'http://localhost:3000<script>alert(1)</script>',
    expectedStatus: [403],
    shouldPass: false
  },
  {
    name: 'No origin header (server-to-server)',
    origin: null,
    expectedStatus: [200, 204, 401],
    shouldPass: true
  },
  {
    name: 'Invalid protocol',
    origin: 'javascript://localhost:3000',
    expectedStatus: [403],
    shouldPass: false
  }
];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function makeRequest(origin) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (origin !== null) {
      headers['Origin'] = origin;
    }

    const options = {
      hostname: HOST,
      port: PORT,
      path: '/health',
      method: 'GET',
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       CORS Security Test Suite - Vulnerability Fix       ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`${colors.blue}Testing API:${colors.reset} ${API_URL}`);
  console.log(`${colors.blue}Test Cases:${colors.reset} ${tests.length}`);
  console.log('');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    process.stdout.write(`${colors.yellow}[${i + 1}/${tests.length}]${colors.reset} ${test.name}... `);

    try {
      const response = await makeRequest(test.origin);
      const statusMatch = test.expectedStatus.includes(response.status);

      // CRITICAL: Check that invalid origins never return 500
      const notCrashed = response.status !== 500;

      const success = statusMatch && notCrashed;

      if (success) {
        console.log(`${colors.green}✓ PASS${colors.reset}`);
        console.log(`  └─ Status: ${response.status} (expected: ${test.expectedStatus.join(' or ')})`);
        passed++;
      } else {
        console.log(`${colors.red}✗ FAIL${colors.reset}`);
        console.log(`  └─ Status: ${response.status} (expected: ${test.expectedStatus.join(' or ')})`);

        if (response.status === 500) {
          console.log(`  └─ ${colors.red}CRITICAL: Server crashed with 500 error!${colors.reset}`);
          console.log(`  └─ This indicates the CORS vulnerability is NOT fixed.`);
        }

        failed++;
      }

      results.push({
        test: test.name,
        origin: test.origin || '(none)',
        expectedStatus: test.expectedStatus,
        actualStatus: response.status,
        passed: success
      });

    } catch (error) {
      console.log(`${colors.red}✗ ERROR${colors.reset}`);
      console.log(`  └─ ${error.message}`);
      failed++;

      results.push({
        test: test.name,
        origin: test.origin || '(none)',
        expectedStatus: test.expectedStatus,
        actualStatus: 'ERROR',
        passed: false,
        error: error.message
      });
    }

    console.log('');
  }

  // Summary
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}                        SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`Total Tests:  ${tests.length}`);
  console.log(`${colors.green}Passed:${colors.reset}       ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset}       ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║   ✓ ALL TESTS PASSED - CORS VULNERABILITY FIXED!        ║${colors.reset}`);
    console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    console.log(`${colors.green}✓ Invalid origins return 403 Forbidden (not 500 error)${colors.reset}`);
    console.log(`${colors.green}✓ Valid origins are accepted correctly${colors.reset}`);
    console.log(`${colors.green}✓ Server does not crash on malicious origins${colors.reset}`);
    console.log(`${colors.green}✓ CORS bypass vulnerability has been mitigated${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.red}║   ✗ TESTS FAILED - VULNERABILITY STILL PRESENT!         ║${colors.reset}`);
    console.log(`${colors.red}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  • ${r.test}`);
        console.log(`    Origin: ${r.origin}`);
        console.log(`    Expected: ${r.expectedStatus.join(' or ')}, Got: ${r.actualStatus}`);
      });
    process.exit(1);
  }
}

// Check if server is running
console.log(`${colors.yellow}Checking if server is running at ${API_URL}...${colors.reset}`);
console.log('');

makeRequest(null)
  .then(() => {
    console.log(`${colors.green}✓ Server is running${colors.reset}`);
    console.log('');
    return runTests();
  })
  .catch((error) => {
    console.log(`${colors.red}✗ Server is not running or not accessible${colors.reset}`);
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.log('');
    console.log(`${colors.yellow}Please start the server first:${colors.reset}`);
    console.log(`  cd mcp-server && npm run api-server`);
    console.log('');
    process.exit(1);
  });
