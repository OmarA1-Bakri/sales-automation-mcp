import { sequelize } from '../sales-automation-api/src/db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initBmadDb() {
    console.log('Initializing BMAD Database Tables...');

    const migrationPath = path.resolve(__dirname, '../sales-automation-api/migrations/20241122_create_workflow_states.sql');
    console.log(`Reading migration file: ${migrationPath}`);

    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon to execute statements individually if needed, 
        // but sequelize.query can often handle multiple statements.
        // However, for safety and better error reporting, let's try executing the whole block.
        // If that fails, we might need to split.

        console.log('Executing SQL migration...');
        await sequelize.query(sql);

        console.log('✅ BMAD Database tables created successfully.');
    } catch (error) {
        console.error('❌ Failed to initialize BMAD database:', error);
    } finally {
        await sequelize.close();
    }
}

initBmadDb();
