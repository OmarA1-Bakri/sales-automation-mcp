/**
 * Test Log Sanitization
 *
 * Verifies that sensitive data is properly redacted from logs
 */

import { createLogger, sanitize } from './src/utils/logger.js';

const logger = createLogger('Test');

console.log('\n===== LOG SANITIZATION TESTS =====\n');

// Test 1: Sanitize API keys in object
console.log('Test 1: API keys in object should be redacted');
const dataWithApiKey = {
  api_key: 'sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774',
  hubspot_api_key: 'secret123',
  lemlist_api_key: 'lemlist_secret_key',
  username: 'john@example.com',
};

console.log('Original data:');
console.log(dataWithApiKey);
console.log('\nSanitized data:');
const sanitized1 = sanitize(dataWithApiKey);
console.log(sanitized1);
console.log('');

// Test 2: Sanitize Bearer tokens in strings
console.log('Test 2: Bearer tokens in strings should be redacted');
const authHeader = 'Authorization: Bearer sk_live_19a942c26354411590068891f08ebe71738e2a137deab1d9dc91934bd4094774';
console.log('Original string:', authHeader);
console.log('Sanitized string:', sanitize(authHeader));
console.log('');

// Test 3: Sanitize nested objects
console.log('Test 3: Nested sensitive fields should be redacted');
const nestedData = {
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    credentials: {
      password: 'secret123',
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    },
  },
  config: {
    api_key: 'sk_live_abc123',
  },
};

console.log('Original nested data:');
console.log(JSON.stringify(nestedData, null, 2));
console.log('\nSanitized nested data:');
console.log(JSON.stringify(sanitize(nestedData), null, 2));
console.log('');

// Test 4: Sanitize array of objects
console.log('Test 4: Arrays with sensitive data should be sanitized');
const arrayData = [
  { email: 'user1@example.com', api_key: 'key1' },
  { email: 'user2@example.com', secret: 'key2' },
];

console.log('Original array:');
console.log(arrayData);
console.log('\nSanitized array:');
console.log(sanitize(arrayData));
console.log('');

// Test 5: Logger methods should sanitize
console.log('Test 5: Logger methods should auto-sanitize');
logger.info('Request with credentials', {
  method: 'POST',
  path: '/api/test',
  headers: {
    authorization: 'Bearer sk_live_fake_token_12345678901234567890123456789012',
    'x-api-key': 'sk_live_another_fake_key_1234567890123456',
  },
  body: {
    username: 'john',
    password: 'mysecretpassword',
  },
});

logger.warn('Invalid authentication attempt', {
  apiKey: 'sk_live_invalid_key_attempt',
  ip: '192.168.1.1',
});

logger.error('Failed to connect', new Error('Connection refused'));

console.log('\n✓ All tests complete - check output above to verify [REDACTED] appears\n');
console.log('Expected behavior:');
console.log('  - All API keys (sk_live_*) should show [REDACTED]');
console.log('  - All password fields should show [REDACTED]');
console.log('  - All access_token/secret fields should show [REDACTED]');
console.log('  - Non-sensitive data (emails, usernames, paths) should be visible');
console.log('');
