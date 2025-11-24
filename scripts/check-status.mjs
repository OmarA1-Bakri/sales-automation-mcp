import { Database } from '../sales-automation-api/src/utils/database.js';
import path from 'path';

async function checkStatus() {
    const dbPath = path.resolve('.sales-automation/sales-automation.db');
    console.log(`Connecting to database at ${dbPath}...`);

    const db = new Database(dbPath);
    await db.initialize();

    console.log('\n=== JOB STATISTICS ===');
    const stats = db.getJobStats();
    console.table(stats);

    console.log('\n=== IMPORTED CONTACTS ===');
    try {
        const stmt = db.prepare('SELECT count(*) as count FROM imported_contacts');
        const result = stmt.get();
        console.log(`Total imported contacts: ${result.count}`);

        const recent = db.prepare('SELECT * FROM imported_contacts ORDER BY imported_at DESC LIMIT 5').all();
        recent.forEach(c => console.log(`- ${c.email} (${c.first_name} ${c.last_name})`));
    } catch (err) {
        console.error('Error querying imported_contacts:', err.message);
    }

    console.log('\n=== RECENT CRM SYNCS ===');
    try {
        const stmt = db.prepare(`
        SELECT *
        FROM crm_sync_log
        ORDER BY synced_at DESC
        LIMIT 10
      `);
        const syncs = stmt.all();

        if (syncs.length === 0) {
            console.log('No recent syncs found (Syncs may have failed before recording).');
        } else {
            syncs.forEach(sync => {
                console.log(`[${sync.synced_at}] ${sync.type.toUpperCase()} ${sync.identifier} -> HubSpot ID: ${sync.hubspot_id || 'Failed'}`);
            });
        }
    } catch (err) {
        console.error('Error querying crm_sync_log:', err.message);
    }

    db.close();
}

checkStatus().catch(console.error);
