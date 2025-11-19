#!/usr/bin/env node
/**
 * API Keys Migration Runner
 * Runs the api_keys and api_key_logs table migration
 * 
 * This script bypasses sequelize-cli to run the migration directly
 * using the Sequelize instance.
 */

import { sequelize } from '../src/models/index.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:');
      console.error(`   Error: ${error.message}`);
      console.error('\n📝 Database Setup Instructions:');
      console.error('   1. Start PostgreSQL: sudo systemctl start postgresql (or docker-compose up -d postgres)');
      console.error('   2. Create database: psql -U postgres -c "CREATE DATABASE rtgs_sales_automation;"');
      console.error('   3. Create user: psql -U postgres -c "CREATE USER rtgs_user WITH PASSWORD \'rtgs_dev_password_2024\';"');
      console.error('   4. Grant privileges: psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rtgs_sales_automation TO rtgs_user;"');
      console.error('\n   Or use Docker: cd mcp-server && docker-compose up -d postgres\n');
      process.exit(1);
    }

    console.log('📦 Loading migration file...');
    
    // Import the migration
    const migrationPath = join(__dirname, '../src/db/migrations/20251112000001-create-api-keys.cjs');
    const migration = require(migrationPath);
    
    console.log('🔧 Running UP migration...');
    
    // Run the up migration
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - api_keys');
    console.log('   - api_key_logs');
    console.log('\n✨ Next steps:');
    console.log('   1. Run: node scripts/migrate-env-keys.js (to migrate existing .env keys)');
    console.log('   2. Test: npm run test:auth (to verify authentication works)');
    console.log('   3. Generate new key: POST /api/keys with admin credentials\n');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`\n   Stack: ${error.stack}`);
    
    // Check if tables already exist
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Tables already exist. To revert:');
      console.log('   1. Run: npm run db:migrate:undo');
      console.log('   2. Then run this script again\n');
    }
    
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

runMigration();
