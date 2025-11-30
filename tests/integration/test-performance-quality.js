/**
 * Performance & Quality Integration Test
 * Tests: Full Pipeline + Performance Metrics + Quality Assessment + Outreach Verification
 */

import { ImportWorker } from '../../sales-automation-api/src/workers/import-worker.js';
import { EnrichmentWorker } from '../../sales-automation-api/src/workers/enrichment-worker.js';
import { CRMSyncWorker } from '../../sales-automation-api/src/workers/crm-sync-worker.js';
import { OutreachWorker } from '../../sales-automation-api/src/workers/outreach-worker.js';
import { HubSpotClient } from '../../sales-automation-api/src/clients/hubspot-client.js';
import { ExploriumClient } from '../../sales-automation-api/src/clients/explorium-client.js';
import { LemlistClient } from '../../sales-automation-api/src/clients/lemlist-client.js';
import { Database } from '../../sales-automation-api/src/utils/database.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load environment variables from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Report file path
const REPORT_PATH = path.resolve(__dirname, '../../test_output/performance_quality_report.md');
const REPORT_DIR = path.dirname(REPORT_PATH);

if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Initialize report
let reportContent = `# E2E Performance & Quality Report
Date: ${new Date().toISOString()}

## 1. Performance Metrics
| Stage | Items | Duration (ms) | Avg per Item (ms) |
|-------|-------|---------------|-------------------|
`;

function appendToReport(content) {
    reportContent += content;
}

function logPerf(stage, items, duration) {
    const avg = items > 0 ? (duration / items).toFixed(2) : 0;
    appendToReport(`| ${stage} | ${items} | ${duration} | ${avg} |\n`);
    console.log(`[PERF] ${stage}: ${items} items in ${duration}ms (${avg}ms/item)`);
}

(async () => {
    try {
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
        const outreachWorker = new OutreachWorker(clients.lemlist, database);

        console.log('='.repeat(70));
        console.log('PERFORMANCE & QUALITY TEST STARTING');
        console.log('='.repeat(70));

        // Step 1: Create test CSV
        const timestamp = Date.now();
        const testCSV = `First Name,Last Name,Email,Company Domain
Patrick,Collison,patrick+${timestamp}@stripe.com,stripe.com
John,Collison,john+${timestamp}@stripe.com,stripe.com
Tobi,Lütke,tobi+${timestamp}@shopify.com,shopify.com`;

        const csvPath = path.join(process.cwd(), 'test-perf-contacts.csv');
        fs.writeFileSync(csvPath, testCSV);

        // Step 2: Import Performance
        const startImport = Date.now();
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
        const importDuration = Date.now() - startImport;
        logPerf('Import', importResult.imported, importDuration);

        if (importResult.imported === 0) {
            throw new Error('No contacts imported');
        }

        // Step 3: Enrichment Performance & Quality
        appendToReport(`\n## 2. Enrichment Quality Analysis\n`);
        const enrichedContacts = [];
        const startEnrich = Date.now();

        for (const contact of importResult.contacts) {
            const contactStart = Date.now();
            const result = await enrichmentWorker.enrichContact(contact);
            const contactDuration = Date.now() - contactStart;

            if (result.success) {
                enrichedContacts.push(result.contact);

                // Quality Analysis
                const c = result.contact;
                appendToReport(`\n### ${c.firstName} ${c.lastName} (${c.email})
- **Enrichment Time**: ${contactDuration}ms
- **Confidence Score**: ${c.confidenceScore || 'N/A'}
- **Data Quality Score**: ${c.dataQuality ? (c.dataQuality * 100).toFixed(1) + '%' : 'N/A'}
- **Company**: ${c.company?.name || 'N/A'} (${c.company?.industry || 'N/A'})
- **Intelligence**:
`);

                if (c.intelligence) {
                    if (c.intelligence.painHypotheses?.length) {
                        appendToReport(`  - **Pain Points**:
${c.intelligence.painHypotheses.map(p => `    - ${p.pain} (Confidence: ${p.confidence})`).join('\n')}
`);
                    } else {
                        appendToReport(`  - **Pain Points**: None generated\n`);
                    }

                    if (c.intelligence.personalizationHooks?.length) {
                        appendToReport(`  - **Hooks**:
${c.intelligence.personalizationHooks.map(h => `    - "${h.hook}" (Strength: ${h.strength})`).join('\n')}
`);
                    } else {
                        appendToReport(`  - **Hooks**: None generated\n`);
                    }

                    if (c.intelligence.whyNow) {
                        appendToReport(`  - **Why Now**: ${c.intelligence.whyNow.trigger} (${c.intelligence.whyNow.urgency})\n`);
                    }
                }
            }
        }
        const enrichDuration = Date.now() - startEnrich;
        logPerf('Enrichment', enrichedContacts.length, enrichDuration);

        // Step 4: Sync Performance
        const startSync = Date.now();
        for (const contact of enrichedContacts) {
            await crmSyncWorker.syncContact(contact, { createIfNew: true, updateIfExists: true });
        }
        const syncDuration = Date.now() - startSync;
        logPerf('CRM Sync', enrichedContacts.length, syncDuration);

        // Step 5: Autonomous Communication Verification
        appendToReport(`\n## 3. Autonomous Communication Verification\n`);

        // Simulate enrollment to check personalization variables
        for (const contact of enrichedContacts) {
            const variables = outreachWorker._preparePersonalizationVariables(
                contact,
                contact.intelligence,
                {}
            );

            appendToReport(`\n### Outreach Variables for ${contact.email}
\`\`\`json
${JSON.stringify(variables, null, 2)}
\`\`\`
`);

            // Verify key variables exist
            const hasHook = !!variables.personalization_hook;
            const hasPain = !!variables.pain_point;

            appendToReport(`- **Has Personalization Hook**: ${hasHook ? '✅' : '❌'}
- **Has Pain Point**: ${hasPain ? '✅' : '❌'}
`);
        }

        // Write report
        fs.writeFileSync(REPORT_PATH, reportContent);
        console.log(`\n✅ Report generated at: ${REPORT_PATH}`);

        // Cleanup
        fs.unlinkSync(csvPath);

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
})();
