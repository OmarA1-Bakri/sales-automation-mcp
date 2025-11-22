#!/usr/bin/env node

/**
 * API Key Generator Utility
 *
 * Generates secure API keys for the Sales Automation API
 *
 * Usage:
 *   node scripts/generate-api-key.js
 *   node scripts/generate-api-key.js --count 3
 *   node scripts/generate-api-key.js --prefix sk_test
 */

import crypto from 'crypto';

function generateApiKey(prefix = 'sk_live') {
  const randomBytes = crypto.randomBytes(32); // 256 bits
  const randomHex = randomBytes.toString('hex'); // 64 hex characters
  return `${prefix}_${randomHex}`;
}

// Parse command line arguments
const args = process.argv.slice(2);
let count = 1;
let prefix = 'sk_live';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--count' && args[i + 1]) {
    count = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--prefix' && args[i + 1]) {
    prefix = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
API Key Generator

Usage:
  node scripts/generate-api-key.js [options]

Options:
  --count <number>    Number of keys to generate (default: 1)
  --prefix <string>   Key prefix (default: sk_live)
  --help, -h          Show this help message

Examples:
  # Generate a single production key
  node scripts/generate-api-key.js

  # Generate 3 test keys
  node scripts/generate-api-key.js --count 3 --prefix sk_test

  # Generate 5 production keys
  node scripts/generate-api-key.js --count 5
`);
    process.exit(0);
  }
}

// Generate keys
console.log(`\nGenerating ${count} API key(s) with prefix '${prefix}':\n`);

const keys = [];
for (let i = 0; i < count; i++) {
  const key = generateApiKey(prefix);
  keys.push(key);
  console.log(`Key ${i + 1}: ${key}`);
}

// Show .env format
if (count > 0) {
  console.log(`\n.env format:\nAPI_KEYS=${keys.join(',')}\n`);
}

// Security reminders
console.log('Security Reminders:');
console.log('  • Add these keys to your .env file (NOT .env.example)');
console.log('  • Never commit API keys to git');
console.log('  • Rotate keys regularly (recommended: every 90 days)');
console.log('  • Use different keys for different environments (dev/staging/prod)');
console.log('  • Keep keys secure and never share them publicly\n');
