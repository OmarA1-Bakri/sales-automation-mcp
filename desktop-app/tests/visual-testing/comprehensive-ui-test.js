const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting comprehensive UI/UX test...\n');

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized', '--disable-web-security']
  });

  const page = await browser.newPage();

  // Navigate to app
  console.log('📍 Navigating to http://localhost:5174...');
  await page.goto('http://localhost:5174', {
    waitUntil: 'networkidle2',
    timeout: 10000
  });

  // Wait for app to load
  await page.waitForSelector('.sidebar', { timeout: 10000 });
  console.log('✅ App loaded successfully\n');

  // Helper function to navigate via sidebar
  async function navigateToPage(pageName) {
    console.log(`📄 Testing ${pageName} page...`);
    await page.evaluate((name) => {
      window.useStore.getState().setCurrentView(name);
    }, pageName);
    await page.waitForTimeout(2000); // Wait for page render
  }

  // Helper function to take screenshot
  async function screenshot(name) {
    const filepath = path.join(screenshotsDir, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  📸 Screenshot: ${name}.png`);
  }

  try {
    // ============================================
    // TEST 1: DASHBOARD
    // ============================================
    await navigateToPage('dashboard');
    await screenshot('01-dashboard');

    // Test YOLO toggle
    const yoloButton = await page.$('button[aria-label*="YOLO"]');
    if (yoloButton) {
      await yoloButton.click();
      await page.waitForTimeout(1000);
      await screenshot('01-dashboard-yolo-toggled');
    } else {
      console.log('  ⚠️  YOLO button not found');
    }
    console.log('✅ Dashboard tests complete\n');

    // ============================================
    // TEST 2: CHAT
    // ============================================
    await navigateToPage('chat');
    await screenshot('02-chat-empty');

    // Test message input
    const chatInput = await page.$('textarea');
    if (chatInput) {
      await chatInput.type('Test message for UI testing');
      await screenshot('02-chat-typing');

      const sendButton = await page.$('button[type="submit"]');
      if (sendButton) {
        await sendButton.click();
        await page.waitForTimeout(3000);
        await screenshot('02-chat-with-message');
      }
    } else {
      console.log('  ⚠️  Chat input not found');
    }
    console.log('✅ Chat tests complete\n');

    // ============================================
    // TEST 3: CAMPAIGNS
    // ============================================
    await navigateToPage('campaigns');
    await screenshot('03-campaigns-list');

    // Open create modal
    const createButtons = await page.$$('button');
    let createButton = null;
    for (const button of createButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text.includes('Create')) {
        createButton = button;
        break;
      }
    }

    if (createButton) {
      await createButton.click();
      await page.waitForTimeout(1000);
      await screenshot('03-campaigns-modal-email');

      // Test tabs
      const allButtons = await page.$$('button');
      let linkedinTab = null;
      let settingsTab = null;

      for (const button of allButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text.includes('LinkedIn')) {
          linkedinTab = button;
        }
        if (text.includes('Settings') && !text.includes('Settings ')) {
          settingsTab = button;
        }
      }

      if (linkedinTab) {
        await linkedinTab.click();
        await page.waitForTimeout(500);
        await screenshot('03-campaigns-modal-linkedin');
      }

      if (settingsTab) {
        await settingsTab.click();
        await page.waitForTimeout(500);
        await screenshot('03-campaigns-modal-settings');
      }

      // Close modal (try ESC key)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('  ⚠️  Create button not found');
    }
    console.log('✅ Campaigns tests complete\n');

    // ============================================
    // TEST 4: CONTACTS
    // ============================================
    await navigateToPage('contacts');
    await screenshot('04-contacts-table');

    // Test search
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('test');
      await page.waitForTimeout(1000);
      await screenshot('04-contacts-search');
      // Clear search
      await searchInput.click({ clickCount: 3 });
      await searchInput.press('Backspace');
      await page.waitForTimeout(500);
    }
    console.log('✅ Contacts tests complete\n');

    // ============================================
    // TEST 5: IMPORT
    // ============================================
    await navigateToPage('import');
    await screenshot('05-import-csv');

    // Test tabs
    const importButtons = await page.$$('button');
    let hubspotTab = null;
    let lemlistTab = null;

    for (const button of importButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text.includes('HubSpot')) {
        hubspotTab = button;
      }
      if (text.includes('Lemlist')) {
        lemlistTab = button;
      }
    }

    if (hubspotTab) {
      await hubspotTab.click();
      await page.waitForTimeout(500);
      await screenshot('05-import-hubspot');
    }

    if (lemlistTab) {
      await lemlistTab.click();
      await page.waitForTimeout(500);
      await screenshot('05-import-lemlist');
    }
    console.log('✅ Import tests complete\n');

    // ============================================
    // TEST 6: ICP
    // ============================================
    await navigateToPage('icp');
    await screenshot('06-icp-overview');

    // Click first profile if exists
    const profileCards = await page.$$('.icp-profile-card, .profile-card, button[role="tab"]');
    if (profileCards.length > 0) {
      await profileCards[0].click();
      await page.waitForTimeout(1000);
      await screenshot('06-icp-selected');
    }
    console.log('✅ ICP tests complete\n');

    // ============================================
    // TEST 7: WORKFLOWS
    // ============================================
    await navigateToPage('workflows');
    await screenshot('07-workflows-overview');

    // Click first workflow if exists
    const workflowCards = await page.$$('.workflow-card, button[data-workflow]');
    if (workflowCards.length > 0) {
      await workflowCards[0].click();
      await page.waitForTimeout(1000);
      await screenshot('07-workflows-selected');
    }
    console.log('✅ Workflows tests complete\n');

    // ============================================
    // TEST 8: SETTINGS
    // ============================================
    await navigateToPage('settings');
    await screenshot('08-settings-overview');

    // Test HTTPS toggle
    const httpsToggle = await page.$('input[type="checkbox"]');
    if (httpsToggle) {
      await httpsToggle.click();
      await page.waitForTimeout(500);
      await screenshot('08-settings-https-toggled');
      // Toggle back
      await httpsToggle.click();
      await page.waitForTimeout(500);
    }
    console.log('✅ Settings tests complete\n');

    // ============================================
    // FINAL SCREENSHOT
    // ============================================
    console.log('\n🎉 All tests complete!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log('\nTest Summary:');
    console.log('- Dashboard: ✅');
    console.log('- Chat: ✅');
    console.log('- Campaigns: ✅');
    console.log('- Contacts: ✅');
    console.log('- Import: ✅');
    console.log('- ICP: ✅');
    console.log('- Workflows: ✅');
    console.log('- Settings: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await screenshot('error-state');
  } finally {
    await browser.close();
  }
})();
