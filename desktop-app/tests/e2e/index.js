/**
 * RTGS Sales Automation - E2E Test Suite Entry Point
 *
 * This file exports all personas, helpers, and the master test suite
 * for use with Puppeteer or Playwright test runners.
 */

// ============================================================
// PERSONAS
// ============================================================

export { persona1_PowerUser } from './personas/persona-1-power-user.js';
export { persona2_DailyDriver } from './personas/persona-2-daily-driver.js';
export { persona3_CampaignSpecialist } from './personas/persona-3-campaign-specialist.js';
export { persona4_ImpatientExecutive } from './personas/persona-4-impatient-executive.js';
export { persona5_OnboardingRookie } from './personas/persona-5-onboarding-rookie.js';

// ============================================================
// MASTER SUITE
// ============================================================

export {
  masterTestSuite,
  getFlowsByPage,
  getCriticalFlows,
  getCoverageSummary,
  getExecutionOrder
} from './master-test-suite.js';

// ============================================================
// HELPERS
// ============================================================

export {
  config,
  navigateToPage,
  navigateToPath,
  waitForPageLoad,
  clickElement,
  typeInField,
  clearField,
  selectOption,
  scrollToElement,
  assertVisible,
  assertContains,
  assertCount,
  assertNoErrors,
  assertUrlContains,
  startTimer,
  stopTimer,
  assertLoadTime,
  takeScreenshot,
  waitForSelector,
  waitForNetworkIdle,
  wait,
  executeFlow,
  executePersona
} from './helpers/puppeteer-helpers.js';

// ============================================================
// FIXTURES
// ============================================================

export { seedDatabase, cleanupTestData } from './fixtures/seed-runner.js';

// ============================================================
// ALL PERSONAS ARRAY
// ============================================================

import { persona1_PowerUser } from './personas/persona-1-power-user.js';
import { persona2_DailyDriver } from './personas/persona-2-daily-driver.js';
import { persona3_CampaignSpecialist } from './personas/persona-3-campaign-specialist.js';
import { persona4_ImpatientExecutive } from './personas/persona-4-impatient-executive.js';
import { persona5_OnboardingRookie } from './personas/persona-5-onboarding-rookie.js';

export const allPersonas = [
  { id: 'persona-1', name: 'Power User', data: persona1_PowerUser },
  { id: 'persona-2', name: 'Daily Driver', data: persona2_DailyDriver },
  { id: 'persona-3', name: 'Campaign Specialist', data: persona3_CampaignSpecialist },
  { id: 'persona-4', name: 'Impatient Executive', data: persona4_ImpatientExecutive },
  { id: 'persona-5', name: 'Onboarding Rookie', data: persona5_OnboardingRookie }
];

// ============================================================
// TEST RUNNER EXAMPLE
// ============================================================

/**
 * Example usage with Puppeteer:
 *
 * import puppeteer from 'puppeteer';
 * import { allPersonas, executePersona, config } from './tests/e2e/index.js';
 *
 * async function runE2ETests() {
 *   const browser = await puppeteer.launch({ headless: false });
 *   const page = await browser.newPage();
 *   await page.goto(config.baseUrl);
 *
 *   for (const persona of allPersonas) {
 *     const results = await executePersona(page, persona.data);
 *     console.log(`${persona.name}: ${results.passedFlows}/${results.flows.length} passed`);
 *   }
 *
 *   await browser.close();
 * }
 *
 * runE2ETests();
 */

export default {
  allPersonas,
  config: {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
    apiUrl: process.env.TEST_API_URL || 'http://localhost:3001'
  }
};
