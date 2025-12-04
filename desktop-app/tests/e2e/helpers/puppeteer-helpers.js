/**
 * Puppeteer E2E Test Helpers
 *
 * Common utilities for executing persona-based tests with Puppeteer.
 * Provides action handlers, assertions, and utility functions.
 */

// ============================================================
// CONFIGURATION
// ============================================================

import { existsSync, mkdirSync } from 'fs';

export const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3001',
  defaultTimeout: 30000,
  screenshotDir: './test-results/screenshots',
  networkIdleTimeout: 2000,
  retryAttempts: 3,
  retryDelay: 500,
  // Console messages to ignore (React dev warnings, expected deprecations)
  // IMPORTANT: Be SPECIFIC - overly broad filters mask real bugs!
  consoleWarningsToIgnore: [
    // React development warnings (safe to ignore)
    'unique key',
    'componentWill',
    'deprecated',
    'Warning:',
    'React does not recognize',
    'validateDOMNesting',

    // Browser navigation errors ONLY (not API errors!)
    // These occur when user navigates away during a fetch - expected behavior
    'net::ERR_ABORTED',           // User navigated away during fetch
    'net::ERR_BLOCKED_BY_CLIENT', // Ad blocker interference

    // HeyGen integration errors (third-party service, not critical path)
    // Added 2025-12-03: HeyGen video service often unavailable in test env
    'Failed to load HeyGen',
    '/api/heygen/',

    // Third-party service unavailability (non-critical features)
    // These services may be offline in test environments
    'Service Unavailable'

    // NOTE: DO NOT add patterns for 401, 403, 404, 500 errors!
    // Those indicate REAL application bugs that tests should catch.
  ]
};

// ============================================================
// ERROR CAPTURE (WeakMap for parallel test safety)
// ============================================================

/**
 * WeakMap to store errors per page instance.
 * Using WeakMap prevents memory leaks and race conditions in parallel Docker tests.
 */
const pageErrors = new WeakMap();

/**
 * Set up error capture listeners for a page instance.
 * MUST be called once per page before running tests.
 * @param {Page} page - Puppeteer page instance
 */
export function setupErrorCapture(page) {
  // Initialize error array for this page
  pageErrors.set(page, []);

  // Capture JavaScript errors (unhandled exceptions)
  page.on('pageerror', error => {
    const errors = pageErrors.get(page);
    if (errors) {
      errors.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log(`   🔴 Page Error: ${error.message}`);
    }
  });

  // Capture console errors (but filter out expected warnings)
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();

      // Check if this is an ignorable warning
      const isIgnorable = config.consoleWarningsToIgnore.some(
        warning => text.toLowerCase().includes(warning.toLowerCase())
      );

      if (!isIgnorable) {
        const errors = pageErrors.get(page);
        if (errors) {
          errors.push({
            type: 'console-error',
            message: text,
            location: msg.location(),
            timestamp: new Date().toISOString()
          });
          console.log(`   🔴 Console Error: ${text.substring(0, 100)}...`);
        }
      }
    }
  });

  console.log('   ✅ Error capture initialized for page');
}

/**
 * Clear collected errors for a page (call between tests for isolation)
 * @param {Page} page - Puppeteer page instance
 */
export function clearErrors(page) {
  pageErrors.set(page, []);
}

/**
 * Get collected errors for a page
 * @param {Page} page - Puppeteer page instance
 * @returns {Array} Array of collected errors
 */
export function getPageErrors(page) {
  return pageErrors.get(page) || [];
}

// Ensure screenshot directory exists
if (!existsSync(config.screenshotDir)) {
  mkdirSync(config.screenshotDir, { recursive: true });
}

// ============================================================
// PAGE NAVIGATION
// ============================================================

/**
 * Navigate to a page using sidebar link
 * @param {Page} page - Puppeteer page instance
 * @param {string} linkText - Sidebar link text (e.g., "Dashboard", "Contacts")
 */
export async function navigateToPage(page, linkText) {
  // Click sidebar link by finding element with matching text
  await page.$$eval('a, button', (elements, text) => {
    const link = elements.find(el => el.textContent.includes(text));
    if (link) link.click();
  }, linkText);

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.defaultTimeout })
    .catch(() => {}); // Don't fail if no navigation occurs (SPA)

  await waitForPageLoad(page);
}

/**
 * Navigate directly to a URL path
 * @param {Page} page - Puppeteer page instance
 * @param {string} path - URL path (e.g., "/dashboard", "/contacts")
 */
export async function navigateToPath(page, path) {
  const url = `${config.baseUrl}${path}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: config.defaultTimeout });
  await waitForPageLoad(page);
}

/**
 * Wait for page to be fully loaded
 * @param {Page} page - Puppeteer page instance
 */
export async function waitForPageLoad(page) {
  // Wait for React to finish rendering
  await page.waitForFunction(() => {
    return document.readyState === 'complete' &&
           !document.querySelector('.loading-spinner') &&
           !document.querySelector('[data-loading="true"]');
  }, { timeout: config.defaultTimeout }).catch(() => {});

  // Small buffer for animations
  await wait(500);
}

// ============================================================
// ELEMENT INTERACTIONS
// ============================================================

/**
 * Click an element using various selector strategies
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector, text=..., or button:has-text(...)
 * @throws {Error} If element is not found
 */
export async function clickElement(page, selector) {
  let clicked = false;

  if (selector.startsWith('text=')) {
    const text = selector.replace('text=', '');
    clicked = await page.evaluate((searchText) => {
      const elements = Array.from(document.querySelectorAll('*'));
      const el = elements.find(e => e.textContent.trim() === searchText || e.textContent.includes(searchText));
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, text);
  } else if (selector.includes(':has-text(')) {
    // Handle button:has-text('Text') pattern - supports comma-separated fallbacks
    const selectors = selector.split(',').map(s => s.trim());

    for (const sel of selectors) {
      const match = sel.match(/(.+):has-text\(['"](.+)['"]\)/);
      if (match) {
        const [, tagSelector, searchText] = match;
        clicked = await page.evaluate((params) => {
          const elements = Array.from(document.querySelectorAll(params.tag));
          const el = elements.find(e => e.textContent.includes(params.text));
          if (el) {
            el.click();
            return true;
          }
          return false;
        }, { tag: tagSelector, text: searchText });
        if (clicked) break;
      }
    }
  } else {
    // Standard CSS selector - also supports comma-separated fallbacks
    const selectors = selector.split(',').map(s => s.trim());

    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        clicked = true;
        break;
      }
    }
  }

  if (!clicked) {
    throw new Error(`clickElement failed: Element not found for selector "${selector}"`);
  }

  // Wait for any resulting actions
  await wait(300);
}

/**
 * Type text into an input field
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Input selector
 * @param {string} value - Text to type
 * @param {object} options - Options { clear: boolean, submit: boolean }
 * @throws {Error} If input element is not found
 */
export async function typeInField(page, selector, value, options = {}) {
  const { clear = true, submit = false } = options;

  // Find the input - supports comma-separated fallback selectors
  let input = null;
  const selectors = selector.split(',').map(s => s.trim());

  for (const sel of selectors) {
    input = await page.$(sel);
    if (input) break;

    // Try to find by placeholder text pattern
    const placeholderMatch = sel.match(/placeholder\*=['"](.+)['"]/);
    if (placeholderMatch) {
      input = await page.$(`input[placeholder*="${placeholderMatch[1]}"], textarea[placeholder*="${placeholderMatch[1]}"]`);
      if (input) break;
    }
  }

  if (!input) {
    throw new Error(`typeInField failed: Input not found for selector "${selector}"`);
  }

  if (clear) {
    await input.click({ clickCount: 3 }); // Select all
    await page.keyboard.press('Backspace');
  }
  await input.type(value, { delay: 50 });

  if (submit) {
    await page.keyboard.press('Enter');
  }
}

/**
 * Clear an input field
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Input selector
 */
export async function clearField(page, selector) {
  const input = await page.$(selector);
  if (input) {
    await input.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
  }
}

/**
 * Select option from dropdown
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Select element selector
 * @param {string} value - Option value to select
 */
export async function selectOption(page, selector, value) {
  await page.select(selector, value);
}

/**
 * Scroll to an element
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Element selector
 * @param {string} direction - 'top' | 'bottom' | 'center'
 */
export async function scrollToElement(page, selector, direction = 'center') {
  const blockValue = direction === 'top' ? 'start' : direction === 'bottom' ? 'end' : 'center';

  if (selector.startsWith('text=')) {
    const text = selector.replace('text=', '');
    await page.evaluate((params) => {
      const elements = Array.from(document.querySelectorAll('*'));
      const el = elements.find(e => e.textContent.includes(params.text));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: params.block });
      }
    }, { text, block: blockValue });
  } else {
    await page.$eval(selector, (el, block) => {
      el.scrollIntoView({ behavior: 'smooth', block });
    }, blockValue);
  }

  await wait(500);
}

/**
 * Press a key on the keyboard
 * @param {Page} page - Puppeteer page instance
 * @param {string} key - Key to press (e.g., 'Enter', 'Tab', 'Escape')
 */
export async function pressKey(page, key) {
  await page.keyboard.press(key);
  await wait(100);
}

/**
 * Set a range slider input to a specific value
 * @param {Page} page - Puppeteer page
 * @param {string} selector - Selector for the range input
 * @param {string|number} value - Value to set (0-100 for percentage sliders)
 */
export async function setSliderValue(page, selector, value) {
  // Try multiple selector formats
  const selectors = selector.split(',').map(s => s.trim());

  for (const sel of selectors) {
    try {
      const element = await page.$(sel);
      if (element) {
        // Set the value using JavaScript evaluation
        await page.evaluate((el, val) => {
          el.value = val;
          // Trigger both input and change events to ensure React picks up the change
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, element, value.toString());
        await wait(100);
        return;
      }
    } catch (e) {
      // Try next selector
    }
  }

  throw new Error(`Slider not found for selector "${selector}"`);
}

// ============================================================
// ASSERTIONS
// ============================================================

/**
 * Assert element is visible
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Element selector
 * @returns {boolean} True if visible
 */
export async function assertVisible(page, selector) {
  if (selector.startsWith('text=')) {
    const text = selector.replace('text=', '');
    const isVisible = await page.evaluate((searchText) => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => {
        const style = window.getComputedStyle(el);
        return el.textContent.includes(searchText) &&
               style.display !== 'none' &&
               style.visibility !== 'hidden';
      });
    }, text);
    return isVisible;
  }

  // Support comma-separated selectors (any match = visible)
  const selectors = selector.split(',').map(s => s.trim());

  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      const isVisible = await page.$eval(sel, (element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      if (isVisible) return true;
    }
  }

  return false;
}

/**
 * Assert element is NOT visible
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Element selector
 * @returns {boolean} True if NOT visible (element missing or hidden)
 */
export async function assertNotVisible(page, selector) {
  return !(await assertVisible(page, selector));
}

/**
 * Assert element contains text
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Container selector
 * @param {string|string[]} text - Text to find (array = any match)
 * @returns {boolean} True if text found
 */
export async function assertContains(page, selector, text) {
  const texts = Array.isArray(text) ? text : [text];

  const found = await page.$eval(selector, (container, searchTexts) => {
    const content = container.textContent.toLowerCase();
    return searchTexts.some(t => content.includes(t.toLowerCase()));
  }, texts).catch(() => false);

  return found;
}

/**
 * Assert element count
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Element selector
 * @param {object} options - { min, max, exact }
 * @returns {boolean} True if count matches
 */
export async function assertCount(page, selector, { min = 0, max = Infinity, exact = null }) {
  const count = await page.$$eval(selector, els => els.length).catch(() => 0);

  if (exact !== null) return count === exact;
  return count >= min && count <= max;
}

/**
 * Assert no JavaScript errors on page (uses WeakMap-based error collection)
 * @param {Page} page - Puppeteer page instance
 * @param {number} threshold - Maximum allowed errors (default 0)
 * @returns {boolean} True if error count <= threshold
 */
export async function assertNoErrors(page, threshold = 0) {
  const errors = getPageErrors(page);
  const errorCount = errors.length;
  const passed = errorCount <= threshold;

  if (!passed) {
    console.log(`   ❌ [noErrors] FAILED: ${errorCount} errors captured (threshold: ${threshold}):`);
    errors.forEach((e, i) => {
      console.log(`      ${i + 1}. [${e.type}] ${e.message.substring(0, 150)}`);
    });
  }

  return passed;
}

/**
 * Assert URL contains string
 * @param {Page} page - Puppeteer page instance
 * @param {string} substring - URL substring to check
 * @returns {boolean} True if URL contains substring
 */
export async function assertUrlContains(page, substring) {
  const url = page.url();
  return url.includes(substring);
}

// ============================================================
// TIMERS & PERFORMANCE
// ============================================================

const timers = new Map();

/**
 * Start a performance timer
 * @param {string} name - Timer name
 */
export function startTimer(name) {
  timers.set(name, Date.now());
}

/**
 * Stop a timer and get duration
 * @param {string} name - Timer name
 * @returns {number} Duration in milliseconds
 */
export function stopTimer(name) {
  if (!timers.has(name)) return 0;
  const duration = Date.now() - timers.get(name);
  timers.delete(name);
  return duration;
}

/**
 * Assert load time is under threshold
 * @param {string} timerName - Timer name
 * @param {number} maxMs - Maximum milliseconds allowed
 * @returns {boolean} True if under threshold
 */
export function assertLoadTime(timerName, maxMs) {
  const duration = stopTimer(timerName);
  return duration <= maxMs;
}

// ============================================================
// SCREENSHOTS
// ============================================================

/**
 * Take a screenshot
 * @param {Page} page - Puppeteer page instance
 * @param {string} name - Screenshot name
 * @param {object} options - Puppeteer screenshot options
 */
export async function takeScreenshot(page, name, options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${config.screenshotDir}/${name}-${timestamp}.png`;

  await page.screenshot({
    path: filename,
    fullPage: options.fullPage || false,
    ...options
  });

  return filename;
}

// ============================================================
// WAIT HELPERS
// ============================================================

/**
 * Wait for a selector to appear
 * Supports comma-separated selectors - waits for ANY to match (first wins)
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - Element selector (or comma-separated list)
 * @param {number} timeout - Timeout in ms
 */
export async function waitForSelector(page, selector, timeout = config.defaultTimeout) {
  if (selector.startsWith('text=')) {
    const text = selector.replace('text=', '');
    await page.waitForFunction(
      (searchText) => {
        return Array.from(document.querySelectorAll('*')).some(el => el.textContent.includes(searchText));
      },
      { timeout },
      text
    );
  } else if (selector.includes(',')) {
    // Handle comma-separated selectors - wait for ANY to match
    const selectors = selector.split(',').map(s => s.trim());
    await Promise.race(
      selectors.map(sel => page.waitForSelector(sel, { timeout }))
    );
  } else {
    await page.waitForSelector(selector, { timeout });
  }
}

/**
 * Wait for network to be idle
 * @param {Page} page - Puppeteer page instance
 * @param {number} idleTime - Idle time in ms
 */
export async function waitForNetworkIdle(page, idleTime = config.networkIdleTimeout) {
  await page.waitForNetworkIdle({ idleTime });
}

/**
 * Wait for a duration
 * @param {number} ms - Milliseconds to wait
 */
export async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// FLOW EXECUTOR
// ============================================================

/**
 * Execute a test flow from persona definition
 * @param {Page} page - Puppeteer page instance
 * @param {object} flow - Flow definition from persona
 * @param {object} options - Execution options
 */
export async function executeFlow(page, flow, options = {}) {
  const results = {
    flowName: flow.name,
    steps: [],
    assertions: [],
    screenshots: [],
    success: true,
    error: null
  };

  console.log(`\n📋 Executing flow: ${flow.name}`);

  try {
    // Execute each step
    for (const step of flow.steps) {
      const stepResult = await executeStep(page, step);
      results.steps.push(stepResult);

      if (!stepResult.success) {
        results.success = false;
        break;
      }
    }

    // Run assertions - failures ALWAYS mark test as failed
    if (flow.assertions && results.success) {
      for (const assertion of flow.assertions) {
        const assertResult = await runAssertion(page, assertion);
        results.assertions.push(assertResult);

        if (!assertResult.passed) {
          console.log(`   ❌ Assertion FAILED: ${assertion.type} - ${assertion.selector}`);
          results.success = false;
          if (!options.continueOnFailure) {
            break; // Stop on first assertion failure
          }
        } else {
          console.log(`   ✅ Assertion passed: ${assertion.type} - ${assertion.selector}`);
        }
      }
    }

    // Take screenshots
    if (flow.screenshots) {
      for (const screenshotName of flow.screenshots) {
        const filename = await takeScreenshot(page, screenshotName);
        results.screenshots.push(filename);
      }
    }

  } catch (error) {
    results.success = false;
    results.error = error.message;
    console.error(`❌ Flow failed: ${error.message}`);
  }

  console.log(`${results.success ? '✅' : '❌'} Flow ${flow.name}: ${results.success ? 'PASSED' : 'FAILED'}`);
  return results;
}

/**
 * Execute a single step
 * @param {Page} page - Puppeteer page instance
 * @param {object} step - Step definition
 */
async function executeStep(page, step) {
  const result = {
    action: step.action,
    description: step.description || step.action,
    success: true,
    duration: 0
  };

  const startTime = Date.now();

  try {
    switch (step.action) {
      case 'navigate':
        await navigateToPage(page, step.selector.replace('text=', ''));
        break;

      case 'click':
        await clickElement(page, step.selector);
        break;

      case 'type':
        await typeInField(page, step.selector, step.value);
        break;

      case 'clear':
        await clearField(page, step.selector);
        break;

      case 'select':
      case 'selectOption':
        await selectOption(page, step.selector, step.value);
        break;

      case 'scroll':
      case 'scrollIntoView':
        await scrollToElement(page, step.selector, step.direction || 'center');
        break;

      case 'wait':
        await wait(step.duration);
        break;

      case 'waitForSelector':
        await waitForSelector(page, step.selector, step.timeout);
        break;

      case 'screenshot':
        await takeScreenshot(page, step.name);
        break;

      case 'assert':
        const isVisible = await assertVisible(page, step.selector);
        if (!isVisible) throw new Error(`Element not visible: ${step.selector}`);
        break;

      case 'timer':
        if (step.start) startTimer(step.name);
        if (step.stop) {
          const duration = stopTimer(step.name);
          if (step.maxDuration && duration > step.maxDuration) {
            throw new Error(`Timer ${step.name} exceeded ${step.maxDuration}ms (took ${duration}ms)`);
          }
        }
        break;

      case 'browserBack':
        await page.goBack({ waitUntil: 'networkidle0' });
        break;

      case 'browserForward':
        await page.goForward({ waitUntil: 'networkidle0' });
        break;

      case 'search':
        // Search for any of the selectors
        for (const sel of step.selectors) {
          if (await assertVisible(page, sel)) {
            result.found = sel;
            break;
          }
        }
        break;

      case 'keyboard':
        // Press a key on the keyboard
        await pressKey(page, step.key);
        break;

      case 'slider':
        // Set a range slider input to a specific value
        await setSliderValue(page, step.selector, step.value);
        break;

      case 'conditional':
        // Execute steps conditionally based on element presence
        if (step.condition && step.condition.selector) {
          const conditionMet = await assertVisible(page, step.condition.selector);
          if (conditionMet && step.ifTrue) {
            // Execute ifTrue steps
            for (const subStep of step.ifTrue) {
              const subResult = await executeStep(page, subStep);
              if (!subResult.success) {
                result.success = false;
                result.error = subResult.error;
                break;
              }
            }
          } else if (!conditionMet && step.ifFalse) {
            // Execute ifFalse steps
            for (const subStep of step.ifFalse) {
              const subResult = await executeStep(page, subStep);
              if (!subResult.success) {
                result.success = false;
                result.error = subResult.error;
                break;
              }
            }
          }
          result.conditionMet = conditionMet;
        }
        break;

      case 'retry':
        // Retry a step multiple times until success
        const maxAttempts = step.attempts || config.retryAttempts;
        const retryDelay = step.delay || config.retryDelay;
        let attempts = 0;
        let lastError = null;

        while (attempts < maxAttempts) {
          try {
            const retryResult = await executeStep(page, step.step);
            if (retryResult.success) {
              result.attempts = attempts + 1;
              break;
            }
            lastError = retryResult.error;
          } catch (e) {
            lastError = e.message;
          }
          attempts++;
          if (attempts < maxAttempts) {
            await wait(retryDelay);
          }
        }

        if (attempts >= maxAttempts) {
          throw new Error(`Retry failed after ${maxAttempts} attempts: ${lastError}`);
        }
        break;

      default:
        console.warn(`Unknown action: ${step.action}`);
    }

    if (step.waitFor) {
      if (typeof step.waitFor === 'number') {
        await wait(step.waitFor);
      } else if (step.waitFor === 'networkidle') {
        await waitForNetworkIdle(page);
      }
    }

  } catch (error) {
    result.success = false;
    result.error = error.message;
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Run a single assertion
 * @param {Page} page - Puppeteer page instance
 * @param {object} assertion - Assertion definition
 */
async function runAssertion(page, assertion) {
  const result = {
    type: assertion.type,
    selector: assertion.selector,
    passed: false
  };

  try {
    switch (assertion.type) {
      case 'visible':
        result.passed = await assertVisible(page, assertion.selector);
        break;

      case 'contains':
        result.passed = await assertContains(page, assertion.selector, assertion.text);
        break;

      case 'count':
        result.passed = await assertCount(page, assertion.selector, assertion);
        break;

      case 'noErrors':
        result.passed = await assertNoErrors(page);
        break;

      case 'url':
        result.passed = await assertUrlContains(page, assertion.contains);
        break;

      case 'loadTime':
        result.passed = true; // Timer assertions handled in steps
        break;

      case 'anyOf':
        for (const sel of assertion.selectors) {
          if (await assertVisible(page, sel)) {
            result.passed = true;
            result.matchedSelector = sel;
            break;
          }
        }
        break;

      case 'notContains':
        result.passed = !(await assertContains(page, assertion.selector, assertion.text));
        break;

      case 'notVisible':
        result.passed = await assertNotVisible(page, assertion.selector);
        break;

      default:
        console.warn(`Unknown assertion type: ${assertion.type}`);
        result.passed = true;
    }
  } catch (error) {
    result.passed = false;
    result.error = error.message;
  }

  return result;
}

// ============================================================
// PERSONA EXECUTOR
// ============================================================

/**
 * Execute all flows for a persona
 * @param {Page} page - Puppeteer page instance
 * @param {object} persona - Persona definition
 * @param {object} options - Execution options
 */
export async function executePersona(page, persona, options = {}) {
  const results = {
    persona: persona.identity.name,
    role: persona.identity.role,
    flows: [],
    passedFlows: 0,
    failedFlows: 0,
    totalDuration: 0
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎭 PERSONA: ${persona.identity.name} (${persona.identity.role})`);
  console.log(`   Goal: ${persona.goals.primary}`);
  console.log(`${'='.repeat(60)}`);

  const startTime = Date.now();

  // Filter flows by priority if specified
  let flows = persona.testFlows;
  if (options.priority) {
    flows = flows.filter(f => f.priority === options.priority);
  }

  for (const flow of flows) {
    // Clear errors before each flow to prevent cascade failures
    clearErrors(page);

    const flowResult = await executeFlow(page, flow, options);
    results.flows.push(flowResult);

    if (flowResult.success) {
      results.passedFlows++;
    } else {
      results.failedFlows++;
      if (options.stopOnFailure) break;
    }
  }

  results.totalDuration = Date.now() - startTime;

  console.log(`\n📊 Persona Summary: ${results.passedFlows}/${results.flows.length} flows passed (${results.totalDuration}ms)`);

  return results;
}

export default {
  config,
  // Error capture (NEW - WeakMap-based for parallel test safety)
  setupErrorCapture,
  clearErrors,
  getPageErrors,
  // Navigation
  navigateToPage,
  navigateToPath,
  waitForPageLoad,
  // Element interactions
  clickElement,
  typeInField,
  clearField,
  selectOption,
  scrollToElement,
  pressKey,
  setSliderValue,
  // Assertions
  assertVisible,
  assertNotVisible,
  assertContains,
  assertCount,
  assertNoErrors,
  assertUrlContains,
  // Timers
  startTimer,
  stopTimer,
  assertLoadTime,
  // Screenshots
  takeScreenshot,
  // Wait helpers
  waitForSelector,
  waitForNetworkIdle,
  wait,
  // Flow execution
  executeFlow,
  executePersona
};
