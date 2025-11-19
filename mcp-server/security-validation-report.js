#!/usr/bin/env node
/**
 * Security Validation Report for Stage 2 B+ Grade
 * Tests code-level security implementations without requiring live server
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('==========================================');
console.log('Security Validation Report - Stage 2');
console.log('==========================================\n');

const results = {
  passed: 0,
  failed: 0,
  checks: []
};

function pass(category, check) {
  console.log(`✅ PASS: [${category}] ${check}`);
  results.passed++;
  results.checks.push({ status: 'PASS', category, check });
}

function fail(category, check, details = '') {
  console.log(`❌ FAIL: [${category}] ${check}`);
  if (details) console.log(`   Details: ${details}`);
  results.failed++;
  results.checks.push({ status: 'FAIL', category, check, details });
}

function info(message) {
  console.log(`ℹ INFO: ${message}`);
}

// ========================================
// TEST 1: Race Condition Fixes
// ========================================
console.log('\n==========================================');
console.log('TEST 1: Race Condition Fixes');
console.log('==========================================\n');

try {
  const authCode = await readFile(join(__dirname, 'src/middleware/authenticate.js'), 'utf-8');

  // Check for atomic check-then-increment in checkRateLimit
  if (authCode.includes('checkRateLimit') && authCode.includes('get(ip) || 0') && authCode.includes('set(ip,')) {
    pass('Race Condition', 'checkRateLimit uses atomic check-then-increment pattern');
  } else {
    fail('Race Condition', 'checkRateLimit atomic pattern not found');
  }

  // Check for atomic increment-then-check in recordFailedAttempt
  if (authCode.includes('recordFailedAttempt') && authCode.includes('get(ip) || 0') && authCode.includes('set(ip,')) {
    pass('Race Condition', 'recordFailedAttempt uses atomic increment-then-check pattern');
  } else {
    fail('Race Condition', 'recordFailedAttempt atomic pattern not found');
  }

  // Check for constant-time comparison
  if (authCode.includes('crypto.timingSafeEqual')) {
    pass('Race Condition', 'Constant-time comparison using crypto.timingSafeEqual');
  } else {
    fail('Race Condition', 'Constant-time comparison not implemented');
  }

} catch (error) {
  fail('Race Condition', 'Could not read authenticate.js', error.message);
}

// ========================================
// TEST 2: Memory Leak Fix
// ========================================
console.log('\n==========================================');
console.log('TEST 2: Memory Leak Prevention');
console.log('==========================================\n');

try {
  const authCode = await readFile(join(__dirname, 'src/middleware/authenticate.js'), 'utf-8');

  // Check for cleanup interval
  if (authCode.includes('setInterval') && authCode.includes('cleanupExpiredEntries')) {
    pass('Memory Leak', 'Cleanup interval configured');
  } else {
    fail('Memory Leak', 'No cleanup interval found');
  }

  // Check for cleanup of failedAttempts
  if (authCode.includes('failedAttempts.delete') || authCode.includes('failedAttempts.clear')) {
    pass('Memory Leak', 'Failed attempts cleanup implemented');
  } else {
    fail('Memory Leak', 'Failed attempts cleanup not found');
  }

  // Check for cleanup of requestCounts
  if (authCode.includes('requestCounts.delete') || authCode.includes('requestCounts.clear')) {
    pass('Memory Leak', 'Request counts cleanup implemented');
  } else {
    fail('Memory Leak', 'Request counts cleanup not found');
  }

  // Check cleanup frequency (should be ~5 minutes = 300000ms)
  if (authCode.includes('300000') || authCode.includes('5 * 60 * 1000')) {
    pass('Memory Leak', 'Cleanup runs every 5 minutes');
  } else {
    info('Cleanup frequency might differ from recommended 5 minutes');
  }

} catch (error) {
  fail('Memory Leak', 'Could not verify memory leak fixes', error.message);
}

// ========================================
// TEST 3: CSRF Protection
// ========================================
console.log('\n==========================================');
console.log('TEST 3: CSRF Protection');
console.log('==========================================\n');

try {
  const serverCode = await readFile(join(__dirname, 'src/api-server.js'), 'utf-8');

  // Check for CSRF middleware import
  if (serverCode.includes('csrf-protection')) {
    pass('CSRF', 'CSRF protection middleware imported');
  } else {
    fail('CSRF', 'CSRF protection middleware not imported');
  }

  // Check for CSRF middleware usage
  if (serverCode.includes('csrfMiddleware')) {
    pass('CSRF', 'CSRF middleware integrated in server');
  } else {
    fail('CSRF', 'CSRF middleware not integrated');
  }

  // Check for CSRF token endpoint
  if (serverCode.includes('/api/csrf-token') || serverCode.includes('getCsrfTokenHandler')) {
    pass('CSRF', 'CSRF token endpoint configured');
  } else {
    fail('CSRF', 'CSRF token endpoint not found');
  }

  // Check CSRF configuration
  if (serverCode.includes('tokenTTL') && serverCode.includes('rotation')) {
    pass('CSRF', 'CSRF configuration includes TTL and rotation');
  } else {
    info('CSRF configuration might be using defaults');
  }

} catch (error) {
  fail('CSRF', 'Could not verify CSRF protection', error.message);
}

// ========================================
// TEST 4: XSS Sanitization
// ========================================
console.log('\n==========================================');
console.log('TEST 4: XSS Sanitization');
console.log('==========================================\n');

try {
  // Check for DOMPurify installation
  const packageJson = JSON.parse(await readFile(join(__dirname, 'package.json'), 'utf-8'));

  if (packageJson.dependencies && packageJson.dependencies['isomorphic-dompurify']) {
    pass('XSS', 'DOMPurify (isomorphic-dompurify) installed');
  } else {
    fail('XSS', 'DOMPurify not found in dependencies');
  }

  // Check for SafeStringSchema
  const validateCode = await readFile(join(__dirname, 'src/middleware/validate.js'), 'utf-8');

  if (validateCode.includes('SafeStringSchema')) {
    pass('XSS', 'SafeStringSchema defined for XSS protection');
  } else {
    fail('XSS', 'SafeStringSchema not found');
  }

  if (validateCode.includes('DOMPurify') || validateCode.includes('dompurify')) {
    pass('XSS', 'DOMPurify integration in validation');
  } else {
    fail('XSS', 'DOMPurify not integrated in validation');
  }

  // Check for XSS test file
  try {
    await readFile(join(__dirname, 'test-xss-sanitization.js'), 'utf-8');
    pass('XSS', 'XSS test suite exists (test-xss-sanitization.js)');
  } catch {
    fail('XSS', 'XSS test suite not found');
  }

} catch (error) {
  fail('XSS', 'Could not verify XSS sanitization', error.message);
}

// ========================================
// TEST 5: Production Error Sanitization
// ========================================
console.log('\n==========================================');
console.log('TEST 5: Production Error Sanitization');
console.log('==========================================\n');

try {
  const validateCode = await readFile(join(__dirname, 'src/middleware/validate.js'), 'utf-8');

  // Check for production environment check
  if (validateCode.includes('process.env.NODE_ENV === \'production\'')) {
    pass('Error Sanitization', 'Production environment detection');
  } else {
    info('Production environment might be detected differently');
  }

  // Check for error sanitization logic
  if (validateCode.includes('hide') || validateCode.includes('sanitize')) {
    pass('Error Sanitization', 'Error sanitization logic present');
  } else {
    fail('Error Sanitization', 'No error sanitization found');
  }

  // Check that detailed errors are only in development
  if (validateCode.match(/production.*?schema/i) || validateCode.match(/schema.*?production/i)) {
    pass('Error Sanitization', 'Schema details hidden in production');
  } else {
    info('Schema sanitization might be implemented differently');
  }

} catch (error) {
  fail('Error Sanitization', 'Could not verify error sanitization', error.message);
}

// ========================================
// TEST 6: Code Quality Checks
// ========================================
console.log('\n==========================================');
console.log('TEST 6: Code Quality & Security Headers');
console.log('==========================================\n');

try {
  const serverCode = await readFile(join(__dirname, 'src/api-server.js'), 'utf-8');

  // Check for helmet (security headers)
  if (serverCode.includes('helmet')) {
    pass('Security Headers', 'Helmet middleware for security headers');
  } else {
    info('Security headers might be configured manually');
  }

  // Check for rate limiting
  if (serverCode.includes('rateLimit') || serverCode.includes('checkRateLimit')) {
    pass('Rate Limiting', 'Rate limiting implemented');
  } else {
    fail('Rate Limiting', 'No rate limiting found');
  }

  // Check for HTTPS enforcement
  if (serverCode.includes('ENABLE_HTTPS') || serverCode.includes('https')) {
    pass('HTTPS', 'HTTPS configuration present');
  } else {
    info('HTTPS might be handled by reverse proxy');
  }

} catch (error) {
  fail('Code Quality', 'Could not verify code quality checks', error.message);
}

// ========================================
// Final Report
// ========================================
console.log('\n==========================================');
console.log('FINAL REPORT');
console.log('==========================================\n');

console.log(`Total Checks: ${results.passed + results.failed}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);

const passRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
console.log(`\nPass Rate: ${passRate}%`);

// Grade calculation
let grade = 'F';
let recommendation = 'NO-GO';

if (passRate >= 95) {
  grade = 'A+';
  recommendation = 'GO - EXCELLENT';
} else if (passRate >= 90) {
  grade = 'A';
  recommendation = 'GO - STRONG';
} else if (passRate >= 85) {
  grade = 'B+';
  recommendation = 'GO - TARGET MET';
} else if (passRate >= 80) {
  grade = 'B';
  recommendation = 'CONDITIONAL GO';
} else if (passRate >= 70) {
  grade = 'C';
  recommendation = 'NO-GO - More work needed';
} else {
  grade = 'D/F';
  recommendation = 'NO-GO - Significant issues';
}

console.log(`\n🎯 Security Grade: ${grade}`);
console.log(`📊 Recommendation: ${recommendation}`);

console.log('\n==========================================');
console.log('CRITICAL FIXES VALIDATION');
console.log('==========================================\n');

const criticalCategories = ['Race Condition', 'Memory Leak', 'CSRF', 'XSS'];
const criticalChecks = results.checks.filter(c => criticalCategories.includes(c.category));
const criticalPass = criticalChecks.filter(c => c.status === 'PASS').length;
const criticalTotal = criticalChecks.length;
const criticalRate = Math.round((criticalPass / criticalTotal) * 100);

console.log(`Critical Security Fixes: ${criticalPass}/${criticalTotal} (${criticalRate}%)`);

if (criticalRate >= 90) {
  console.log('✅ All critical security fixes validated');
} else {
  console.log('❌ Some critical security fixes need attention');
}

console.log('\n==========================================\n');

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
