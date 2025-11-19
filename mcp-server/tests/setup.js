/**
 * Jest Test Setup
 * Configures test environment, database, and global utilities
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: join(__dirname, '..', '.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';  // Suppress logs during tests

// Set test API keys
process.env.API_KEYS = 'sk_test_key1,sk_test_key2';

// Use in-memory SQLite for tests
process.env.DATABASE_URL = ':memory:';

// Global test utilities
global.testHelpers = {
  /**
   * Generate valid API key for authentication
   */
  getValidApiKey() {
    return 'sk_test_key1';
  },

  /**
   * Generate invalid API key
   */
  getInvalidApiKey() {
    return 'sk_invalid_key';
  },

  /**
   * Wait for async operations
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

console.log('Test environment initialized');
