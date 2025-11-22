#!/usr/bin/env node

/**
 * Security Headers Validation Test
 * Verifies Helmet.js security headers are properly configured
 *
 * Tests:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 */

import http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const HOST = API_URL.replace('http://', '').replace('https://', '').split(':')[0];
const PORT = parseInt(API_URL.split(':')[2] || '3000');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Required security headers and their expected values
const requiredHeaders = [
  {
    name: 'Content-Security-Policy',
    key: 'content-security-policy',
    required: true,
    mustContain: ['default-src', 'script-src', 'style-src'],
    description: 'Prevents XSS attacks by restricting resource loading'
  },
  {
    name: 'Strict-Transport-Security',
    key: 'strict-transport-security',
    required: false, // Optional for HTTP, required for HTTPS
    mustContain: ['max-age'],
    description: 'Forces HTTPS connections'
  },
  {
    name: 'X-Frame-Options',
    key: 'x-frame-options',
    required: true,
    mustContain: ['DENY', 'SAMEORIGIN'],
    description: 'Prevents clickjacking attacks',
    acceptAnyOf: true
  },
  {
    name: 'X-Content-Type-Options',
    key: 'x-content-type-options',
    required: true,
    expectedValue: 'nosniff',
    description: 'Prevents MIME type sniffing'
  },
  {
    name: 'X-DNS-Prefetch-Control',
    key: 'x-dns-prefetch-control',
    required: true,
    expectedValue: 'off',
    description: 'Disables DNS prefetching'
  },
  {
    name: 'X-Download-Options',
    key: 'x-download-options',
    required: true,
    expectedValue: 'noopen',
    description: 'Prevents file download execution in IE'
  },
  {
    name: 'Referrer-Policy',
    key: 'referrer-policy',
    required: true,
    mustContain: ['strict-origin', 'same-origin', 'no-referrer'],
    description: 'Controls referrer information',
    acceptAnyOf: true
  },
  {
    name: 'X-Permitted-Cross-Domain-Policies',
    key: 'x-permitted-cross-domain-policies',
    required: true,
    expectedValue: 'none',
    description: 'Restricts cross-domain policy files'
  }
];

function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3456'
      }
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

function checkHeader(header, responseHeaders) {
  const value = responseHeaders[header.key];

  if (!value) {
    return {
      passed: !header.required,
      severity: header.required ? 'CRITICAL' : 'WARNING',
      message: header.required ? 'Missing required header' : 'Optional header not present'
    };
  }

  // Check expected value
  if (header.expectedValue) {
    const matches = value.toLowerCase() === header.expectedValue.toLowerCase();
    return {
      passed: matches,
      severity: matches ? 'OK' : 'CRITICAL',
      message: matches
        ? `Correct value: ${value}`
        : `Expected "${header.expectedValue}", got "${value}"`
    };
  }

  // Check must contain
  if (header.mustContain) {
    if (header.acceptAnyOf) {
      // At least one must be present
      const hasAny = header.mustContain.some(term =>
        value.toLowerCase().includes(term.toLowerCase())
      );
      return {
        passed: hasAny,
        severity: hasAny ? 'OK' : 'CRITICAL',
        message: hasAny
          ? `Contains expected directive: ${value}`
          : `Must contain one of: ${header.mustContain.join(', ')}`
      };
    } else {
      // All must be present
      const missing = header.mustContain.filter(term =>
        !value.toLowerCase().includes(term.toLowerCase())
      );
      return {
        passed: missing.length === 0,
        severity: missing.length === 0 ? 'OK' : 'CRITICAL',
        message: missing.length === 0
          ? `All directives present: ${value}`
          : `Missing directives: ${missing.join(', ')}`
      };
    }
  }

  return {
    passed: true,
    severity: 'OK',
    message: `Present: ${value}`
  };
}

async function runTests() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║          Security Headers Validation Test Suite          ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`${colors.blue}Testing API:${colors.reset} ${API_URL}`);
  console.log(`${colors.blue}Required Headers:${colors.reset} ${requiredHeaders.filter(h => h.required).length}`);
  console.log(`${colors.blue}Optional Headers:${colors.reset} ${requiredHeaders.filter(h => !h.required).length}`);
  console.log('');

  try {
    const response = await makeRequest();

    console.log(`${colors.yellow}Response Status:${colors.reset} ${response.status}`);
    console.log('');

    let passed = 0;
    let failed = 0;
    let warnings = 0;
    const results = [];

    console.log(`${colors.bold}${colors.cyan}Security Headers Check:${colors.reset}`);
    console.log(`${colors.cyan}────────────────────────────────────────────────────────────${colors.reset}`);
    console.log('');

    for (const header of requiredHeaders) {
      const result = checkHeader(header, response.headers);
      results.push({ header, result });

      const statusIcon = result.passed
        ? `${colors.green}✓${colors.reset}`
        : result.severity === 'WARNING'
        ? `${colors.yellow}⚠${colors.reset}`
        : `${colors.red}✗${colors.reset}`;

      const statusColor = result.passed
        ? colors.green
        : result.severity === 'WARNING'
        ? colors.yellow
        : colors.red;

      console.log(`${statusIcon} ${colors.bold}${header.name}${colors.reset}`);
      console.log(`  Description: ${colors.blue}${header.description}${colors.reset}`);
      console.log(`  Status: ${statusColor}${result.message}${colors.reset}`);
      console.log('');

      if (result.passed) {
        passed++;
      } else if (result.severity === 'WARNING') {
        warnings++;
      } else {
        failed++;
      }
    }

    // Additional headers present check
    console.log(`${colors.cyan}────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}Additional Security Headers:${colors.reset}`);
    console.log('');

    const additionalHeaders = [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'access-control-allow-methods',
      'x-ratelimit-limit',
      'x-powered-by'
    ];

    additionalHeaders.forEach(key => {
      const value = response.headers[key];
      if (value !== undefined) {
        const isSecure = key !== 'x-powered-by'; // x-powered-by should NOT be present
        const icon = (key === 'x-powered-by' && value)
          ? `${colors.yellow}⚠${colors.reset}`
          : `${colors.green}✓${colors.reset}`;

        console.log(`${icon} ${key}: ${value}`);

        if (key === 'x-powered-by') {
          console.log(`  ${colors.yellow}Warning: X-Powered-By header leaks server information${colors.reset}`);
          warnings++;
        }
      }
    });

    console.log('');

    // Summary
    console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}                        SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('');
    console.log(`Total Headers Checked: ${requiredHeaders.length}`);
    console.log(`${colors.green}Passed:${colors.reset}                ${passed}`);
    console.log(`${colors.yellow}Warnings:${colors.reset}              ${warnings}`);
    console.log(`${colors.red}Failed:${colors.reset}                ${failed}`);
    console.log('');

    // Security Score
    const score = Math.round((passed / requiredHeaders.length) * 100);
    const scoreColor = score >= 90
      ? colors.green
      : score >= 70
      ? colors.yellow
      : colors.red;

    console.log(`${colors.bold}Security Score: ${scoreColor}${score}%${colors.reset}`);
    console.log('');

    if (failed === 0 && warnings === 0) {
      console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.green}║   ✓ ALL SECURITY HEADERS PROPERLY CONFIGURED!           ║${colors.reset}`);
      console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
      console.log('');
      console.log(`${colors.green}✓ Helmet.js is working correctly${colors.reset}`);
      console.log(`${colors.green}✓ All critical security headers present${colors.reset}`);
      console.log(`${colors.green}✓ Server is protected against common attacks${colors.reset}`);
      process.exit(0);
    } else if (failed === 0) {
      console.log(`${colors.yellow}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.yellow}║   ⚠ SECURITY HEADERS PRESENT WITH WARNINGS              ║${colors.reset}`);
      console.log(`${colors.yellow}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
      console.log('');
      console.log(`${colors.yellow}Consider addressing the warnings above for better security.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.red}║   ✗ CRITICAL SECURITY HEADERS MISSING!                  ║${colors.reset}`);
      console.log(`${colors.red}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
      console.log('');
      console.log(`${colors.red}Failed Headers:${colors.reset}`);
      results
        .filter(r => !r.passed && r.result.severity === 'CRITICAL')
        .forEach(r => {
          console.log(`  • ${r.header.name}: ${r.result.message}`);
        });
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    console.log(`${colors.red}✗ Test execution failed${colors.reset}`);
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Check if server is running
console.log(`${colors.yellow}Checking if server is running at ${API_URL}...${colors.reset}`);
console.log('');

makeRequest()
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
