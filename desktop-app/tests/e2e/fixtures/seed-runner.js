/**
 * E2E Test Data Seed Runner
 *
 * Executes seed-test-data.sql against the test database.
 * Run with: node tests/e2e/fixtures/seed-runner.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'sales_automation',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
};

/**
 * Execute SQL file against database
 */
async function seedDatabase() {
  console.log('🌱 Starting E2E test data seeding...\n');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}\n`);

  const pool = new Pool(dbConfig);

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read SQL file
    const sqlPath = join(__dirname, 'seed-test-data.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing seed script...\n');

    // Execute SQL
    await client.query(sql);

    // Verify results
    const verification = await client.query(`
      SELECT 'ICP Profiles' as table_name, COUNT(*) as count FROM icp_profiles WHERE name LIKE 'E2E Test%'
      UNION ALL
      SELECT 'Contacts', COUNT(*) FROM contacts WHERE email LIKE '%@e2e-test.local'
      UNION ALL
      SELECT 'Campaigns', COUNT(*) FROM campaign_templates WHERE name LIKE 'E2E Test%'
      UNION ALL
      SELECT 'Outcomes', COUNT(*) FROM outreach_outcomes WHERE id LIKE 'e2e-outcome%'
    `);

    console.log('📊 Seeded Data Summary:');
    console.log('─'.repeat(40));
    verification.rows.forEach(row => {
      console.log(`   ${row.table_name.padEnd(20)} ${row.count}`);
    });
    console.log('─'.repeat(40));

    client.release();
    console.log('\n✅ E2E test data seeding complete!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up E2E test data...\n');

  const pool = new Pool(dbConfig);

  try {
    const client = await pool.connect();

    await client.query(`
      DELETE FROM outreach_outcomes WHERE id LIKE 'e2e-outcome%';
      DELETE FROM contacts WHERE email LIKE '%@e2e-test.local';
      DELETE FROM campaign_templates WHERE name LIKE 'E2E Test%';
      DELETE FROM icp_profiles WHERE name LIKE 'E2E Test%';
    `);

    client.release();
    console.log('✅ Test data cleaned up!\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'seed':
    seedDatabase();
    break;
  case 'cleanup':
    cleanupTestData();
    break;
  case 'reset':
    cleanupTestData().then(() => seedDatabase());
    break;
  default:
    console.log(`
E2E Test Data Seed Runner

Usage:
  node seed-runner.js seed     - Seed test data
  node seed-runner.js cleanup  - Remove test data
  node seed-runner.js reset    - Cleanup then re-seed

Environment Variables:
  POSTGRES_HOST     - Database host (default: localhost)
  POSTGRES_PORT     - Database port (default: 5432)
  POSTGRES_DB       - Database name (default: sales_automation)
  POSTGRES_USER     - Database user (default: postgres)
  POSTGRES_PASSWORD - Database password (default: postgres)
`);
}

export { seedDatabase, cleanupTestData };
