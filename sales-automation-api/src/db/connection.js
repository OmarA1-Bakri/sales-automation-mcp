/**
 * PostgreSQL Database Connection
 * Handles connection pool and provides database access
 */

import pg from 'pg';
import Sequelize from 'sequelize';

const { Pool } = pg;

/**
 * Database Configuration from Environment
 */
const config = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'rtgs_sales_automation',
  user: process.env.POSTGRES_USER || 'rtgs_user',
  password: process.env.POSTGRES_PASSWORD || 'rtgs_password_dev',

  // Connection pool settings
  max: 20,                    // Maximum number of clients in pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30s
  connectionTimeoutMillis: 5000, // Timeout when connecting

  // SSL settings (disabled for local development)
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
};

/**
 * Native PostgreSQL Connection Pool
 * For raw SQL queries
 */
const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('[Database] Unexpected error on idle client', err);
});

/**
 * Sequelize ORM Instance
 * For model-based queries
 */
const sequelize = new Sequelize(
  config.database,
  config.user,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'postgres',

    // Logging
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    // Pool configuration (FIX #3: Connection pool with proper timeouts)
    pool: {
      max: config.max,
      min: 2,                           // Keep minimum connections warm
      acquire: 30000,                   // 30 seconds max wait for connection
      idle: 10000,                      // 10 seconds idle timeout
      evict: 1000                       // Check for idle connections every second
    },

    // SSL and timeout configuration (FIX #3: Transaction timeouts)
    dialectOptions: {
      ...(config.ssl ? { ssl: config.ssl } : {}),
      statement_timeout: 10000,         // 10-second query timeout
      idle_in_transaction_session_timeout: 30000  // 30-second transaction timeout
    },

    // Retry configuration (FIX #3: Auto-retry on serialization failures)
    retry: {
      max: 3,
      match: [
        /deadlock detected/i,
        /could not serialize/i,
        /lock timeout/i,
        /connection refused/i,
        /connection terminated/i
      ]
    },

    // Timezone
    timezone: '+00:00',

    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

/**
 * Test database connection with retry logic
 * @param {number} maxRetries Maximum number of retry attempts (default: 5)
 * @param {number} retryDelay Delay between retries in ms (default: 2000)
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(maxRetries = 5, retryDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Database] Connection attempt ${attempt}/${maxRetries}...`);
      console.log(`[Database] Connecting to ${config.host}:${config.port}/${config.database}`);

      // Test with native pool
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now, current_database() as db, version() as version');
      client.release();

      console.log('[Database] ✅ Connection successful!');
      console.log(`[Database] Database: ${result.rows[0].db}`);
      console.log(`[Database] Server time: ${result.rows[0].now}`);
      console.log(`[Database] PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);

      // Test with Sequelize
      await sequelize.authenticate();
      console.log('[Database] ✅ Sequelize connection successful!');

      return true;
    } catch (err) {
      console.error(`[Database] Attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (err.code === 'ECONNREFUSED') {
        console.error('[Database] PostgreSQL server is not running or not accessible');
        console.error(`[Database] Check: docker ps | grep postgres`);
      }

      if (attempt < maxRetries) {
        console.log(`[Database] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('[Database] ❌ All connection attempts failed');
        console.error('[Database] Suggestions:');
        console.error('[Database] 1. Check if PostgreSQL is running: docker ps');
        console.error('[Database] 2. Verify connection settings in .env');
        console.error('[Database] 3. Check PostgreSQL logs: docker logs rtgs-postgres');
      }
    }
  }

  return false;
}

/**
 * Execute a raw SQL query
 * @param {string} text SQL query
 * @param {Array} params Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Database Query]', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        rows: res.rowCount,
        duration: `${duration}ms`
      });
    }

    return res;
  } catch (err) {
    console.error('[Database Error]', {
      query: text.substring(0, 100),
      error: err.message
    });
    throw err;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to call client.release() when done!
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Execute a transaction with proper error context
 * @param {Function} callback Function that receives client and executes queries
 * @param {string} description Optional description of what the transaction does
 * @returns {Promise<any>} Result from callback
 */
async function transaction(callback, description = 'unnamed transaction') {
  const client = await pool.connect();
  const transactionId = Date.now().toString(36) + Math.random().toString(36).substring(7);

  try {
    console.log(`[Transaction ${transactionId}] BEGIN - ${description}`);
    await client.query('BEGIN');

    const result = await callback(client);

    await client.query('COMMIT');
    console.log(`[Transaction ${transactionId}] COMMIT - ${description}`);
    return result;
  } catch (err) {
    console.error(`[Transaction ${transactionId}] ERROR - ${description}:`, err.message);

    try {
      await client.query('ROLLBACK');
      console.log(`[Transaction ${transactionId}] ROLLBACK SUCCESS - ${description}`);
    } catch (rollbackErr) {
      console.error(`[Transaction ${transactionId}] ROLLBACK FAILED!`, rollbackErr.message);
      // This is critical - rollback failure means database might be in inconsistent state
      throw new Error(`Transaction rollback failed: ${rollbackErr.message}. Original error: ${err.message}`);
    }

    // Enhance error with transaction context
    const enhancedError = new Error(`Transaction "${description}" failed: ${err.message}`);
    enhancedError.transactionId = transactionId;
    enhancedError.originalError = err;
    throw enhancedError;
  } finally {
    client.release();
  }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database stats
 */
async function getStats() {
  try {
    const result = await query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_stat_get_tuples_inserted(c.oid) AS n_tup_ins,
        pg_stat_get_tuples_updated(c.oid) AS n_tup_upd,
        pg_stat_get_tuples_deleted(c.oid) AS n_tup_del
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    return {
      tables: result.rows,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (err) {
    console.error('[Database] Error getting stats:', err.message);
    return null;
  }
}

/**
 * Close all database connections
 */
async function close() {
  console.log('[Database] Closing connections...');
  await pool.end();
  await sequelize.close();
  console.log('[Database] Connections closed');
}

// Graceful shutdown
process.on('SIGTERM', close);
process.on('SIGINT', close);

export {
  // Native PostgreSQL
  pool,
  query,
  getClient,
  transaction,

  // Sequelize ORM
  sequelize,
  Sequelize,

  // Utilities
  testConnection,
  getStats,
  close,

  // Config (read-only)
  config
};

export default sequelize;
