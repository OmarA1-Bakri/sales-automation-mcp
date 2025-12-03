#!/usr/bin/env node
/**
 * E2E Persona Test Runner
 *
 * Runs E2E tests for a specific persona in isolation.
 * Designed to run in Docker containers for parallel execution.
 *
 * Usage:
 *   PERSONA=1 node run-persona.js
 *   node run-persona.js --persona=2
 *   node run-persona.js --persona=3 --priority=critical
 */

import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://frontend:5173',
  apiUrl: process.env.TEST_API_URL || 'http://api:3000',
  resultsDir: process.env.TEST_RESULTS_DIR || '/app/test-results',
  timeout: parseInt(process.env.TEST_TIMEOUT || '60000', 10),
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0', 10),
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    persona: process.env.PERSONA || '1',
    priority: process.env.PRIORITY || null,
    stopOnFailure: process.env.STOP_ON_FAILURE === 'true',
  };

  for (const arg of args) {
    if (arg.startsWith('--persona=')) {
      parsed.persona = arg.split('=')[1];
    } else if (arg.startsWith('--priority=')) {
      parsed.priority = arg.split('=')[1];
    } else if (arg === '--stop-on-failure') {
      parsed.stopOnFailure = true;
    }
  }

  return parsed;
}

// Dynamic import of persona
async function loadPersona(personaNumber) {
  const personaMap = {
    '1': './personas/persona-1-power-user.js',
    '2': './personas/persona-2-daily-driver.js',
    '3': './personas/persona-3-campaign-specialist.js',
    '4': './personas/persona-4-impatient-executive.js',
    '5': './personas/persona-5-onboarding-rookie.js',
  };

  const personaPath = personaMap[personaNumber];
  if (!personaPath) {
    throw new Error(`Unknown persona: ${personaNumber}. Valid options: 1-5`);
  }

  const module = await import(personaPath);
  const exportName = Object.keys(module).find(k => k.startsWith('persona'));
  return module[exportName];
}

// Import test helpers
async function loadHelpers() {
  const helpers = await import('./helpers/puppeteer-helpers.js');
  return helpers;
}

// Wait for services to be ready
async function waitForServices(maxRetries = 30, retryDelay = 2000) {
  console.log('🔄 Waiting for services to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check API health
      const apiResponse = await fetch(`${config.apiUrl}/health`);
      if (!apiResponse.ok) {
        throw new Error(`API health check failed: ${apiResponse.status}`);
      }

      // Check frontend
      const frontendResponse = await fetch(config.baseUrl);
      if (!frontendResponse.ok) {
        throw new Error(`Frontend check failed: ${frontendResponse.status}`);
      }

      console.log('✅ All services are ready');
      return true;
    } catch (error) {
      console.log(`   Attempt ${i + 1}/${maxRetries}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Services did not become ready in time');
}

// Main test runner
async function runPersonaTests() {
  const startTime = Date.now();
  const args = parseArgs();

  console.log('\n' + '═'.repeat(70));
  console.log(`🎭 E2E TEST RUNNER - PERSONA ${args.persona}`);
  console.log('═'.repeat(70));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Priority Filter: ${args.priority || 'all'}`);
  console.log(`Stop on Failure: ${args.stopOnFailure}`);
  console.log('═'.repeat(70) + '\n');

  // Ensure results directory exists
  const personaResultsDir = join(config.resultsDir, `persona-${args.persona}`);
  if (!existsSync(personaResultsDir)) {
    mkdirSync(personaResultsDir, { recursive: true });
  }

  // Wait for services
  await waitForServices();

  // Load persona and helpers
  const persona = await loadPersona(args.persona);
  const { executePersona, setupErrorCapture, clearErrors, config: helperConfig } = await loadHelpers();

  // Override helper config with our settings
  helperConfig.baseUrl = config.baseUrl;
  helperConfig.apiUrl = config.apiUrl;
  helperConfig.defaultTimeout = config.timeout;
  helperConfig.screenshotDir = join(personaResultsDir, 'screenshots');

  // Ensure screenshot directory exists
  if (!existsSync(helperConfig.screenshotDir)) {
    mkdirSync(helperConfig.screenshotDir, { recursive: true });
  }

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: config.headless ? 'new' : false,
    slowMo: config.slowMo,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  let results = null;
  let exitCode = 0;

  try {
    // Create page
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set up error capture (WeakMap-based for parallel test safety)
    setupErrorCapture(page);

    // Set up request interception for debugging
    page.on('requestfailed', request => {
      console.log(`   [Request Failed] ${request.url()}: ${request.failure()?.errorText}`);
    });

    // Navigate to app
    console.log(`📍 Navigating to ${config.baseUrl}...`);
    await page.goto(config.baseUrl, {
      waitUntil: 'networkidle0',
      timeout: config.timeout
    });

    // Run persona tests
    const options = {
      priority: args.priority,
      stopOnFailure: args.stopOnFailure,
      continueOnFailure: !args.stopOnFailure,
    };

    results = await executePersona(page, persona, options);

    // Take final screenshot
    await page.screenshot({
      path: join(personaResultsDir, 'final-state.png'),
      fullPage: true,
    });

    // Determine exit code
    if (results.failedFlows > 0) {
      exitCode = 1;
    }

  } catch (error) {
    console.error('\n❌ Fatal error during test execution:', error.message);
    exitCode = 1;
    results = {
      persona: persona?.identity?.name || `Persona ${args.persona}`,
      role: persona?.identity?.role || 'Unknown',
      flows: [],
      passedFlows: 0,
      failedFlows: 1,
      totalDuration: Date.now() - startTime,
      fatalError: error.message,
    };
  } finally {
    await browser.close();
  }

  // Calculate duration
  const totalDuration = Date.now() - startTime;
  results.totalDuration = totalDuration;

  // Write results to JSON
  const resultsFile = join(personaResultsDir, 'results.json');
  writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log(`📊 PERSONA ${args.persona} TEST RESULTS`);
  console.log('═'.repeat(70));
  console.log(`Persona: ${results.persona} (${results.role})`);
  console.log(`Flows Passed: ${results.passedFlows}`);
  console.log(`Flows Failed: ${results.failedFlows}`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Results saved to: ${resultsFile}`);

  if (results.fatalError) {
    console.log(`\n❌ FATAL ERROR: ${results.fatalError}`);
  }

  console.log('\n' + (exitCode === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
  console.log('═'.repeat(70) + '\n');

  process.exit(exitCode);
}

// Run
runPersonaTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
