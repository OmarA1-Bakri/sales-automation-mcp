const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// RTGS Sales Automation - Puppeteer Visual UI/UX Testing
(async () => {
  const screenshotDir = './test-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized', '--disable-web-security']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  
  const screenshot = async (name) => {
    await page.screenshot({ path: path.join(screenshotDir, name + '.png'), fullPage: true });
    console.log('  Screenshot:', name);
  };

  const navigateTo = async (pageName, ariaLabel) => {
    const button = await page.waitForSelector('button[aria-label*="' + ariaLabel + '"]', { timeout: 5000 });
    await button.click();
    await page.waitForTimeout(500);
    await screenshot(pageName + '-page');
  };

  try {
    console.log('\nRTGS Sales Automation - Visual Testing\n');
    
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 });
    await screenshot('01-initial-load');
    
    console.log('\nTEST 1: Dashboard');
    await screenshot('02-dashboard-overview');
    
    console.log('\nTEST 2: Chat Page');
    await navigateTo('03-chat', 'AI Assistant');
    
    console.log('\nTEST 3: Campaigns Page');
    await navigateTo('04-campaigns', 'Campaigns');
    
    console.log('\nTEST 4: Contacts Page');
    await navigateTo('05-contacts', 'Contacts');
    
    console.log('\nTEST 5: Import Page');
    await navigateTo('06-import', 'Import');
    
    console.log('\nTEST 6: ICP Page');
    await navigateTo('07-icp', 'ICP Profiles');
    
    console.log('\nTEST 7: Workflows Page');
    await navigateTo('08-workflows', 'Workflows');
    
    console.log('\nTEST 8: Settings Page');
    await navigateTo('09-settings', 'Settings');
    
    console.log('\nTests Complete!');
    console.log('Screenshots saved to:', path.resolve(screenshotDir));
    
  } catch (error) {
    console.error('Error:', error.message);
    await screenshot('error-state');
  } finally {
    await browser.close();
  }
})();
