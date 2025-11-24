import { testConnection } from '../sales-automation-api/src/db/connection.js';

async function check() {
    console.log('Checking BMAD Database Connection (PostgreSQL)...');
    const success = await testConnection();
    if (success) {
        console.log('✅ BMAD Database is accessible.');
    } else {
        console.log('❌ BMAD Database is NOT accessible.');
    }
    process.exit(success ? 0 : 1);
}

check();
