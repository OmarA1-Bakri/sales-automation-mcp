/**
 * Quick test script for Explorium API integration
 */

import { ExploriumClient } from '../../sales-automation-api/src/clients/explorium-client.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testExploriumAPI() {
  console.log('='.repeat(60));
  console.log('EXPLORIUM API INTEGRATION TEST');
  console.log('='.repeat(60));

  try {
    // Initialize client
    console.log('\n1. Initializing Explorium client...');
    const client = new ExploriumClient();
    console.log('✅ Client initialized');
    console.log(`   API Key: ${client.apiKey.substring(0, 8)}...`);
    console.log(`   Base URL: ${client.baseURL}`);

    // Test health check
    console.log('\n2. Testing API connectivity...');
    const health = await client.healthCheck();
    console.log(`   Status: ${health.status}`);

    if (health.success) {
      console.log('✅ API connection successful');
      console.log('   Features:');
      Object.entries(health.features).forEach(([feature, enabled]) => {
        console.log(`     - ${feature}: ${enabled ? '✅' : '❌'}`);
      });
    } else {
      console.log(`❌ API connection failed: ${health.error}`);
      return;
    }

    // Test contact enrichment
    console.log('\n3. Testing contact enrichment...');
    const testContact = {
      email: 'patrick@stripe.com',
      firstName: 'Patrick',
      lastName: 'Collison',
      companyDomain: 'stripe.com'
    };

    console.log(`   Enriching: ${testContact.firstName} ${testContact.lastName} (${testContact.email})`);
    const enrichedContact = await client.enrichContact(testContact, { includeSocialMedia: true });

    if (enrichedContact.success === false) {
      console.log(`   ⚠️ Enrichment failed: ${enrichedContact.error}`);
    } else if (enrichedContact.confidenceScore === 0) {
      console.log(`   ⚠️ No data found for contact`);
    } else {
      console.log('   ✅ Contact enriched successfully');
      console.log(`     Full Name: ${enrichedContact.fullName || 'N/A'}`);
      console.log(`     Email Verified: ${enrichedContact.emailVerified}`);
      console.log(`     Title: ${enrichedContact.title || 'N/A'}`);
      console.log(`     Seniority: ${enrichedContact.seniority || 'N/A'}`);
      console.log(`     Department: ${enrichedContact.department || 'N/A'}`);
      console.log(`     LinkedIn: ${enrichedContact.linkedinUrl || 'N/A'}`);
      console.log(`     Location: ${enrichedContact.location || 'N/A'}`);
      console.log(`     Skills: ${enrichedContact.skills?.slice(0, 5).join(', ') || 'N/A'}`);
      console.log(`     Years Experience: ${enrichedContact.yearsOfExperience || 'N/A'}`);
      console.log(`     Confidence Score: ${enrichedContact.confidenceScore}`);

      if (enrichedContact.socialMediaMetrics) {
        console.log('     Social Media:');
        console.log(`       LinkedIn Followers: ${enrichedContact.socialMediaMetrics.linkedinFollowers || 'N/A'}`);
        console.log(`       LinkedIn Connections: ${enrichedContact.socialMediaMetrics.linkedinConnections || 'N/A'}`);
        console.log(`       Twitter Followers: ${enrichedContact.socialMediaMetrics.twitterFollowers || 'N/A'}`);
      }
    }

    // Test company enrichment
    console.log('\n4. Testing company enrichment...');
    const testCompany = {
      domain: 'stripe.com'
    };

    console.log(`   Enriching: ${testCompany.domain}`);
    const enrichedCompany = await client.enrichCompany(testCompany, {
      includeSocialMedia: true,
      includeWorkforce: true,
      includeIntent: true
    });

    if (enrichedCompany.success === false) {
      console.log(`   ⚠️ Enrichment failed: ${enrichedCompany.error}`);
    } else if (enrichedCompany.confidenceScore === 0) {
      console.log(`   ⚠️ No data found for company`);
    } else {
      console.log('   ✅ Company enriched successfully');
      console.log(`     Name: ${enrichedCompany.name}`);
      console.log(`     Industry: ${enrichedCompany.industry || 'N/A'}`);
      console.log(`     Sub-Industry: ${enrichedCompany.subIndustry || 'N/A'}`);
      console.log(`     Employees: ${enrichedCompany.employees || enrichedCompany.employeeRange || 'N/A'}`);
      console.log(`     Revenue: ${enrichedCompany.revenue || enrichedCompany.revenueRange || 'N/A'}`);
      console.log(`     Founded: ${enrichedCompany.foundedYear || 'N/A'}`);
      console.log(`     Headquarters: ${enrichedCompany.headquarters || 'N/A'}`);
      console.log(`     Company Type: ${enrichedCompany.companyType || 'N/A'}`);
      console.log(`     Technologies: ${enrichedCompany.technologies?.slice(0, 5).join(', ') || 'N/A'}`);
      console.log(`     Funding Stage: ${enrichedCompany.fundingStage || 'N/A'}`);
      console.log(`     Total Funding: ${enrichedCompany.totalFundingAmount || 'N/A'}`);
      console.log(`     Investors: ${enrichedCompany.investors?.slice(0, 3).join(', ') || 'N/A'}`);
      console.log(`     Signals: ${enrichedCompany.signals?.join(', ') || 'N/A'}`);
      console.log(`     Confidence Score: ${enrichedCompany.confidenceScore}`);

      // Show detailed tech breakdown if available
      if (enrichedCompany.techByCategory) {
        const categories = Object.entries(enrichedCompany.techByCategory)
          .filter(([_, techs]) => techs.length > 0)
          .slice(0, 3);
        if (categories.length > 0) {
          console.log('     Tech Categories:');
          categories.forEach(([category, techs]) => {
            console.log(`       - ${category}: ${techs.slice(0, 3).join(', ')}`);
          });
        }
      }

      // Show advanced enrichment data
      if (enrichedCompany.socialMediaMetrics) {
        console.log('     Social Media Metrics:');
        console.log(`       LinkedIn Followers: ${enrichedCompany.socialMediaMetrics.linkedinFollowers || 'N/A'}`);
        console.log(`       Twitter Followers: ${enrichedCompany.socialMediaMetrics.twitterFollowers || 'N/A'}`);
      }

      if (enrichedCompany.workforceMetrics) {
        console.log('     Workforce Metrics:');
        console.log(`       Engineering Headcount: ${enrichedCompany.workforceMetrics.engineeringHeadcount || 'N/A'}`);
        console.log(`       Sales Headcount: ${enrichedCompany.workforceMetrics.salesHeadcount || 'N/A'}`);
        console.log(`       New Hires (30d): ${enrichedCompany.workforceMetrics.newHiresLast30Days || 'N/A'}`);
        console.log(`       Open Positions: ${enrichedCompany.workforceMetrics.openPositions || 'N/A'}`);
      }

      if (enrichedCompany.intentData) {
        console.log('     Intent Data:');
        console.log(`       Topics: ${enrichedCompany.intentData.topics?.slice(0, 3).join(', ') || 'N/A'}`);
        console.log(`       Trending: ${enrichedCompany.intentData.trendingTopics?.slice(0, 3).join(', ') || 'N/A'}`);
      }
    }

    // Test rate limit status
    console.log('\n5. Checking rate limit status...');
    const rateLimit = client.getRateLimitStatus();
    console.log(`   Max Requests/Minute: ${rateLimit.maxRequestsPerMinute}`);
    console.log(`   Remaining Requests: ${rateLimit.remainingRequests}`);
    console.log(`   Reset In: ${rateLimit.secondsUntilReset}s`);

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run the test
testExploriumAPI();
