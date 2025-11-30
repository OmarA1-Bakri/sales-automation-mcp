require('dotenv').config();

/**
 * Validate required database environment variables
 * Called at runtime to prevent silent failures
 */
function validateDbEnv(env) {
  const isProduction = env === 'production';
  const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_HOST'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const msg = `[Database Config] Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      throw new Error(`FATAL: ${msg}. Cannot start in production without explicit credentials.`);
    } else {
      console.warn(`WARNING: ${msg}. Please set these in your .env file.`);
    }
  }
}

// Validate based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
validateDbEnv(nodeEnv);

/**
 * Helper to get required env var or throw
 */
function requireEnv(key, fallback = null) {
  const value = process.env[key];
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback;
}

module.exports = {
  development: {
    username: requireEnv('DB_USER', 'rtgs_user'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME', 'rtgs_sales_automation'),
    host: requireEnv('DB_HOST', 'localhost'),
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: requireEnv('DB_USER', 'rtgs_user'),
    password: requireEnv('DB_PASSWORD'),
    database: process.env.DB_NAME_TEST || 'rtgs_sales_automation_test',
    host: requireEnv('DB_HOST', 'localhost'),
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    host: requireEnv('DB_HOST'),
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
};
