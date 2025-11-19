/**
 * Full Pipeline Integration Test
 * Tests: CSV Import → Explorium Enrichment → HubSpot Sync
 */

import { ImportWorker } from './mcp-server/src/workers/import-worker.js';
import { EnrichmentWorker } from './mcp-server/src/workers/enrichment-worker.js';
import { CRMSyncWorker } from './mcp-server/src/workers/crm-sync-worker.js';
import { HubSpotClient } from './mcp-server/src/clients/hubspot-client.js';
import { ExploriumClient } from './mcp-server/src/clients/explorium-client.js';
import { LemlistClient } from './mcp-server/src/clients/lemlist-client.js';
import { Database } from './mcp-server/src/utils/database.js';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize everything in an async IIFE
(async () => {
  // Initialize clients
  const clients = {
    hubspot: new HubSpotClient({ apiKey: process.env.HUBSPOT_API_KEY }),
    explorium: new ExploriumClient(process.env.EXPLORIUM_API_KEY),
    lemlist: new LemlistClient({ apiKey: process.env.LEMLIST_API_KEY })
  };

  // Initialize database
  const database = new Database();
  await database.initialize();

  // Initialize workers
  const importWorker = new ImportWorker(clients, database);
  const enrichmentWorker = new EnrichmentWorker(clients, database);
  const crmSyncWorker = new CRMSyncWorker(clients.hubspot, database);

  // Track test results
  const results = {
    imported: 0,
    enriched: 0,
    synced: 0,
    errors: [],
    startTime: Date.now()
  };

  // Promise to wait for pipeline completion
  let pipelineCompleteResolve;
  const pipelineComplete = new Promise(resolve => {
    pipelineCompleteResolve = resolve;
  });

  console.log('='.repeat(70));
  console.log('FULL PIPELINE INTEGRATION TEST');
  console.log('='.repeat(70));

  // Wire up the pipeline: Import → Enrich → Sync
  importWorker.on('contacts-imported', async (data) => {
  console.log(`\n✅ IMPORT COMPLETE: ${data.count} contacts imported`);
  results.imported = data.count;

  try {
    // Step 3: Enrich contacts
    console.log('\n3. Enriching contacts...');
    const enrichedContacts = [];

    for (const contact of data.contacts) {
      console.log(`   Enriching: ${contact.firstName} ${contact.lastName} (${contact.email})`);

      // Enrich contact (worker method returns enriched contact directly, not wrapped in {success, data})
      const enrichedContact = await enrichmentWorker.enrichContact(contact);

      if (enrichedContact) {
        enrichedContacts.push(enrichedContact);
        console.log(`     ✅ Enriched with confidence: ${enrichedContact.confidenceScore || 'N/A'}`);
      } else {
        console.log(`     ⚠️  Enrichment failed or returned null`);
      }
    }

    results.enriched = enrichedContacts.length;

    // Show sample enriched data
    if (enrichedContacts.length > 0) {
      const sample = enrichedContacts[0];
      console.log(`\n   Sample Enriched Contact:`);
      console.log(`     Name: ${sample.fullName || sample.firstName + ' ' + sample.lastName}`);
      console.log(`     Title: ${sample.title || 'N/A'}`);
      console.log(`     Company: ${sample.currentCompany || sample.company?.name || 'N/A'}`);
      console.log(`     LinkedIn: ${sample.linkedinUrl || 'N/A'}`);
      console.log(`     Email Verified: ${sample.emailVerified || 'N/A'}`);
      console.log(`     Confidence: ${sample.confidenceScore || 'N/A'}`);

      if (sample.company) {
        console.log(`\n   Company Data:`);
        console.log(`     Industry: ${sample.company.industry || 'N/A'}`);
        console.log(`     Employees: ${sample.company.employees || 'N/A'}`);
        console.log(`     Technologies: ${sample.company.technologies?.slice(0, 3).join(', ') || 'N/A'}`);
      }
    }

    // Step 4: Sync to HubSpot
    console.log('\n4. Syncing to HubSpot...');
    const syncResults = [];

    for (const enrichedContact of enrichedContacts) {
      console.log(`   Syncing: ${enrichedContact.email}`);

      const syncResult = await crmSyncWorker.syncContact(enrichedContact, {
        createIfNew: true,
        updateIfExists: true
      });

      if (syncResult && syncResult.success) {
        syncResults.push(syncResult);
        console.log(`     ✅ ${syncResult.action}: Contact ID ${syncResult.contactId || 'N/A'}`);
      } else {
        console.log(`     ⚠️  Sync failed: ${syncResult?.error || 'Unknown error'}`);
      }
    }

    results.synced = syncResults.length;

    // Show sample sync result
    if (syncResults.length > 0) {
      const sample = syncResults[0];
      console.log(`\n   Sample Sync Result:`);
      console.log(`     Contact ID: ${sample.contactId || 'N/A'}`);
      console.log(`     Company ID: ${sample.companyId || 'N/A'}`);
      console.log(`     Action: ${sample.action || 'N/A'}`);
    }

  } catch (error) {
    console.error(`\n❌ PIPELINE ERROR: ${error.message}`);
    console.error(error.stack);
    results.errors.push(error.message);
  } finally {
    // Signal that pipeline is complete
    if (pipelineCompleteResolve) {
      pipelineCompleteResolve();
    }
  }
});

async function runTest() {
  try {
    // Step 1: Create test CSV file
    console.log('\n1. Creating test CSV file...');
    const testCSV = `First Name,Last Name,Email,Company Domain
Patrick,Collison,patrick@stripe.com,stripe.com
John,Collison,john@stripe.com,stripe.com
Tobi,Lütke,tobi@shopify.com,shopify.com`;

    const csvPath = path.join(process.cwd(), 'test-contacts.csv');
    fs.writeFileSync(csvPath, testCSV);
    console.log(`   ✅ Created: ${csvPath}`);

    // Step 2: Import CSV
    console.log('\n2. Importing CSV...');
    const importResult = await importWorker.importFromCSV({
      filePath: csvPath,
      fieldMapping: {
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        companyDomain: 'Company Domain'
      },
      skipHeader: true,
      deduplicate: true
    });

    console.log(`   Imported: ${importResult.imported} contacts`);
    console.log(`   Skipped: ${importResult.skipped} contacts`);
    if (importResult.errors && importResult.errors.length > 0) {
      console.log(`   Errors: ${importResult.errors.length}`);
      importResult.errors.forEach(err => console.log(`     - ${err}`));
    }

    // Only wait for pipeline if we actually imported contacts
    if (importResult.imported > 0) {
      // Wait for the event-driven pipeline to complete (enrichment + sync)
      // The 'contacts-imported' event handler runs async and completes enrichment and sync
      console.log('\n   Waiting for pipeline to complete...');
      await Promise.race([
        pipelineComplete,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Pipeline timeout after 120s')), 120000))
      ]);
    } else {
      console.log('\n   ⚠️  No contacts imported, skipping enrichment and sync');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Contacts Imported: ${results.imported}`);
    console.log(`Contacts Enriched: ${results.enriched}`);
    console.log(`Contacts Synced: ${results.synced}`);
    console.log(`Errors: ${results.errors.length}`);
    if (results.errors.length > 0) {
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    console.log(`Total Time: ${((Date.now() - results.startTime) / 1000).toFixed(2)}s`);

    // Clean up
    console.log('\n5. Cleaning up...');
    fs.unlinkSync(csvPath);
    console.log(`   ✅ Deleted: ${csvPath}`);

    // Final result
    console.log('\n' + '='.repeat(70));
    if (results.imported > 0 && results.enriched > 0 && results.synced > 0) {
      console.log('✅ FULL PIPELINE TEST PASSED');
    } else {
      console.log('⚠️  FULL PIPELINE TEST PARTIAL SUCCESS');
      console.log('   Some steps did not complete as expected');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
  }

  // Run the test
  await runTest();
})().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
