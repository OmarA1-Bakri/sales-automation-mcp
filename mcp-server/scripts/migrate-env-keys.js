#!/usr/bin/env node
/**
 * Migrate .env API Keys to Database
 * 
 * This script migrates plaintext API keys from .env to the database
 * with Argon2id hashing, providing a migration path from T2.8 to T2.11.
 */

import { ApiKey, sequelize } from '../src/models/index.js';
import dotenv from 'dotenv';
import { createLogger } from '../src/utils/logger.js';

dotenv.config();

const logger = createLogger('KeyMigration');

async function migrateKeys() {
  try {
    console.log('🔍 Reading API keys from .env...');
    
    // Get keys from environment
    const envKeys = process.env.API_KEYS
      ? process.env.API_KEYS.split(',').map(k => k.trim())
      : [];
    
    if (envKeys.length === 0) {
      console.log('⚠️  No API keys found in .env (API_KEYS variable)');
      console.log('   This is OK if you are starting fresh with database keys.\n');
      process.exit(0);
    }
    
    console.log(`📦 Found ${envKeys.length} key(s) in .env\n`);
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected\n');
    
    const results = [];
    
    for (let i = 0; i < envKeys.length; i++) {
      const oldKey = envKeys[i];
      const keyNumber = i + 1;
      
      try {
        console.log(`[${keyNumber}/${envKeys.length}] Processing key: ${oldKey.substring(0, 15)}...`);
        
        // Extract prefix if key follows sk_live_* pattern
        let keyPrefix = oldKey.match(/^(sk_live_[a-z0-9]+)_/)?.[1];
        
        if (!keyPrefix) {
          console.log(`   ⚠️  Key doesn't follow sk_live_* pattern, generating new format...`);
        }
        
        // Generate new database-backed key with same scopes
        const newKeyData = await ApiKey.generateKey(
          `Migrated .env key #${keyNumber}`,
          ['*'],  // Grant full access to migrated keys
          90,     // 90 day expiration
          null    // No user association
        );
        
        results.push({
          oldKeyPrefix: keyPrefix || oldKey.substring(0, 20),
          newKeyId: newKeyData.id,
          newKeyPrefix: newKeyData.prefix,
          newKeyFull: newKeyData.key,  // SAVE THIS!
          status: 'migrated'
        });
        
        console.log(`   ✅ Migrated → New Key: ${newKeyData.prefix}`);
        console.log(`   📝 Full Key (SAVE THIS): ${newKeyData.key}\n`);
        
      } catch (error) {
        console.error(`   ❌ Failed to migrate key #${keyNumber}: ${error.message}\n`);
        results.push({
          oldKeyPrefix: oldKey.substring(0, 20),
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total keys in .env: ${envKeys.length}`);
    console.log(`Successfully migrated: ${results.filter(r => r.status === 'migrated').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);
    console.log('');
    
    // Display new keys
    const migratedKeys = results.filter(r => r.status === 'migrated');
    if (migratedKeys.length > 0) {
      console.log('🔑 NEW DATABASE-BACKED KEYS (SAVE THESE!):');
      console.log('─'.repeat(70));
      migratedKeys.forEach((key, idx) => {
        console.log(`\n[${idx + 1}] ID: ${key.newKeyId}`);
        console.log(`    Prefix: ${key.newKeyPrefix}`);
        console.log(`    Full Key: ${key.newKeyFull}`);
        console.log(`    Old: ${key.oldKeyPrefix}...`);
      });
      console.log('\n' + '─'.repeat(70));
    }
    
    // Next steps
    console.log('\n✨ NEXT STEPS:');
    console.log('1. ⚠️  SAVE the new keys above - they will NEVER be shown again!');
    console.log('2. Update your API clients to use the new keys');
    console.log('3. Test authentication with new keys: curl -H "Authorization: Bearer <key>" https://localhost:3443/health');
    console.log('4. Once verified, remove API_KEYS from .env file');
    console.log('5. The old .env keys will continue to work during transition (fallback auth)');
    console.log('6. After all clients migrated, remove old keys and fallback auth\n');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`\n   Stack: ${error.stack}\n`);
    
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore
    }
    
    process.exit(1);
  }
}

migrateKeys();
