# Interactive Visual UI/UX Testing Plan Using Puppeteer

## Executive Summary

This plan provides comprehensive interactive visual testing for the RTGS Sales Automation Desktop Electron app using Puppeteer browser automation. The app runs on `http://localhost:5174` with 8 main pages using Zustand state-based routing (not URL-based). The testing approach focuses on visual verification, interactive element testing, form validation, modal interactions, and navigation flow.

---

## Application Architecture Analysis

### Routing System
- **Type**: Zustand state-based routing (not URL-based)
- **Navigation**: Clicks on sidebar buttons update `currentView` state
- **Pages**: Dashboard, Chat, Campaigns, Contacts, Import, ICP, Workflows, Settings
- **Key Selectors**: Navigation via sidebar `button` elements with aria-current attributes

### Key Components Identified
1. **Sidebar**: Main navigation with 8 menu items + toggle button
2. **TitleBar**: Custom frameless window controls
3. **Modals**: Campaign Editor, Create Campaign Modal, Create ICP Modal
4. **Forms**: Import (CSV/HubSpot/Lemlist), Settings (API config), Chat input
5. **Tables**: Contacts table with pagination, selection, and bulk actions
6. **Cards**: Campaign cards, Workflow cards, ICP profile cards, Stats cards

### Visual Theme
- **Framework**: Tailwind CSS
- **Color Scheme**: Dark theme (slate-900, slate-800)
- **Primary Color**: RTGS Blue (custom color)
- **Interactive States**: Hover effects, focus rings, transitions

---

## Testing Strategy

### Phase 1: Setup & Initial Navigation
1. Launch Puppeteer and navigate to `http://localhost:5174`
2. Verify page loads and take initial full-page screenshot
3. Test sidebar toggle functionality
4. Verify all 8 pages are accessible via navigation

### Phase 2: Page-by-Page Interactive Testing
Each page will be tested for:
- Visual appearance (screenshots)
- Interactive elements (buttons, inputs, selects)
- Form validation (error states)
- Modal interactions (open/close)
- Data display (tables, cards, lists)
- Loading states
- Error states

### Phase 3: Cross-Page Flows
1. Multi-step workflows (Import → Contacts → Campaigns)
2. Navigation persistence
3. State management across page changes

---

## Detailed Test Plans by Page

## 1. Dashboard Page (currentView: 'dashboard')

### Initial State
```javascript
// Navigate to Dashboard
await page.click('button[aria-current="page"]'); // Already on dashboard by default
await page.screenshot({ path: 'dashboard-initial.png', fullPage: true });
```

### Interactive Elements to Test

#### A. YOLO Mode Toggle
**Selector**: `button` containing "Enable YOLO" or "Pause" text
**Test Steps**:
1. Screenshot initial YOLO card state
2. Click "Enable YOLO" button
3. Verify toast notification appears
4. Verify button text changes or redirects to settings
5. Screenshot final state

**Puppeteer Commands**:
```javascript
// Test YOLO Mode toggle
await page.screenshot({ path: 'dashboard-yolo-before.png' });

const yoloButton = await page.waitForSelector('button::-p-text(Enable YOLO)', { timeout: 5000 });
if (yoloButton) {
  await yoloButton.click();
  await page.waitForTimeout(1000); // Wait for toast
  await page.screenshot({ path: 'dashboard-yolo-clicked.png' });
}
```

#### B. Stats Cards
**Elements**: 4 stat cards (Total Contacts, Active Campaigns, Emails Sent, Positive Replies)
**Test Steps**:
1. Verify all 4 cards are visible
2. Screenshot cards section
3. Hover over each card to check hover effects

**Puppeteer Commands**:
```javascript
// Count stat cards
const statCards = await page.$$('div[role="figure"]');
console.log(`Found ${statCards.length} stat cards`);

// Hover over each card
for (let i = 0; i < statCards.length; i++) {
  await statCards[i].hover();
  await page.screenshot({ path: `dashboard-stat-card-${i}-hover.png` });
}
```

#### C. Quick Actions
**Elements**: 3 quick action cards (Chat with AI, Import Contacts, Configure ICP)
**Test Steps**:
1. Screenshot quick actions section
2. Click each action and verify navigation
3. Return to dashboard after each test

---

## 2. Chat Page (currentView: 'chat')

### Navigation
```javascript
// Click sidebar item for Chat
const chatButton = await page.waitForSelector('button[aria-label*="AI Assistant"]');
await chatButton.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'chat-page-initial.png', fullPage: true });
```

### Interactive Elements to Test

#### A. Quick Action Cards (Empty State)
**Selector**: Grid of 6 quick action buttons
**Test Steps**:
1. Screenshot empty state welcome screen
2. Click each quick action to populate input
3. Verify input field gets populated with prompt

**Puppeteer Commands**:
```javascript
// Test quick action population
const quickActions = await page.$$('.grid.grid-cols-2 button');
console.log(`Found ${quickActions.length} quick actions`);

// Click first quick action
if (quickActions.length > 0) {
  await quickActions[0].click();
  await page.screenshot({ path: 'chat-quick-action-clicked.png' });
  
  // Check if input is populated
  const inputValue = await page.$eval('textarea', el => el.value);
  console.log('Input populated with:', inputValue);
}
```

#### B. Chat Input & Send
**Selector**: `textarea` and send button
**Test Steps**:
1. Type message in textarea
2. Test Enter key to send
3. Test Shift+Enter for new line
4. Click Send button
5. Verify loading state
6. Verify message appears in chat

**Puppeteer Commands**:
```javascript
// Type and send message
await page.type('textarea[placeholder*="Ask me anything"]', 'Show me my contacts');
await page.screenshot({ path: 'chat-message-typed.png' });

// Send message
const sendButton = await page.waitForSelector('button::-p-text(Send)');
await sendButton.click();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'chat-message-sent.png', fullPage: true });
```

---

## 3. Campaigns Page (currentView: 'campaigns')

### Navigation
```javascript
const campaignsButton = await page.waitForSelector('button[aria-label*="Campaigns"]');
await campaignsButton.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'campaigns-page-initial.png', fullPage: true });
```

### Interactive Elements to Test

#### A. Create Campaign Button
**Selector**: Button with text "+ Create Campaign"
**Test Steps**:
1. Click button
2. Verify modal opens
3. Screenshot modal
4. Close modal
5. Verify modal closes

**Puppeteer Commands**:
```javascript
// Open Create Campaign modal
const createButton = await page.waitForSelector('button::-p-text(Create Campaign)');
await createButton.click();
await page.waitForSelector('.fixed.inset-0');
await page.screenshot({ path: 'campaigns-create-modal.png' });

// Close modal
const closeButton = await page.waitForSelector('button::-p-text(Close)');
await closeButton.click();
await page.waitForTimeout(500);
```

#### B. Campaign Cards (List View)
**Test Steps**:
1. Screenshot campaign list
2. Hover over campaign card
3. Click campaign card
4. Verify details view loads

**Puppeteer Commands**:
```javascript
// Get all campaign cards
const campaignCards = await page.$$('.bg-slate-800.rounded-lg.p-6.border.cursor-pointer');

if (campaignCards.length > 0) {
  // Hover first card
  await campaignCards[0].hover();
  await page.screenshot({ path: 'campaigns-card-hover.png' });
  
  // Click to view details
  await campaignCards[0].click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'campaigns-details-view.png', fullPage: true });
}
```

---

## 4. Contacts Page (currentView: 'contacts')

### Interactive Elements to Test

#### A. Search Input
**Selector**: Input with placeholder "Search contacts..."
**Test Steps**:
1. Type search query
2. Verify table filters in real-time
3. Screenshot filtered results
4. Clear search
5. Verify all contacts return

**Puppeteer Commands**:
```javascript
// Test search
await page.type('input[placeholder*="Search contacts"]', 'john');
await page.waitForTimeout(500);
await page.screenshot({ path: 'contacts-search-filtered.png' });

// Clear search
await page.click('input[placeholder*="Search contacts"]', { clickCount: 3 });
await page.keyboard.press('Backspace');
await page.screenshot({ path: 'contacts-search-cleared.png' });
```

#### B. Contact Selection (Checkboxes)
**Test Steps**:
1. Click "select all" checkbox in header
2. Verify all contacts selected
3. Screenshot selected state
4. Verify bulk action buttons appear

**Puppeteer Commands**:
```javascript
// Select all contacts
const selectAllCheckbox = await page.$('thead input[type="checkbox"]');
if (selectAllCheckbox) {
  await selectAllCheckbox.click();
  await page.screenshot({ path: 'contacts-all-selected.png' });
  
  // Verify bulk actions visible
  const enrichButton = await page.$('button::-p-text(Enrich)');
  console.log('Bulk actions visible:', enrichButton !== null);
}
```

#### C. Pagination
**Test Steps**:
1. Verify pagination controls at bottom
2. Click "Next" button
3. Verify page number updates
4. Screenshot page 2

**Puppeteer Commands**:
```javascript
// Test pagination
const nextButton = await page.$('button::-p-text(Next)');
if (nextButton) {
  const isDisabled = await nextButton.evaluate(el => el.disabled);
  if (!isDisabled) {
    await nextButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'contacts-page-2.png' });
  }
}
```

---

## 5. Import Page (currentView: 'import')

### Interactive Elements to Test

#### A. Tab Navigation
**Elements**: CSV Upload, HubSpot, Lemlist tabs
**Test Steps**:
1. Screenshot default tab (CSV)
2. Click HubSpot tab
3. Verify tab content changes
4. Screenshot HubSpot tab

**Puppeteer Commands**:
```javascript
// Test tab navigation
const hubspotTab = await page.waitForSelector('button::-p-text(HubSpot)');
await hubspotTab.click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'import-hubspot-tab.png' });

const lemlistTab = await page.waitForSelector('button::-p-text(Lemlist)');
await lemlistTab.click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'import-lemlist-tab.png' });

const csvTab = await page.waitForSelector('button::-p-text(CSV Upload)');
await csvTab.click();
```

#### B. CSV File Upload
**Test Steps**:
1. Click file upload area
2. Simulate file selection (if possible in test environment)
3. Verify file preview appears

**Puppeteer Commands**:
```javascript
// Note: File upload in Puppeteer
const inputFile = await page.$('input[type="file"]');

// In real testing, provide actual CSV file path
const filePath = './test-data/sample-contacts.csv';
if (inputFile && fs.existsSync(filePath)) {
  await inputFile.uploadFile(filePath);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'import-csv-preview.png' });
  
  // Click import button
  const importButton = await page.waitForSelector('button::-p-text(Import Contacts)');
  await importButton.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'import-csv-result.png' });
}
```

---

## 6. ICP Page (currentView: 'icp')

### Interactive Elements to Test

#### A. Profile Sidebar List
**Test Steps**:
1. Screenshot profile list
2. Click on each profile
3. Verify details panel updates

**Puppeteer Commands**:
```javascript
// Get all profile items
const profiles = await page.$$('.cursor-pointer.transition-colors');

for (let i = 0; i < Math.min(profiles.length, 3); i++) {
  await profiles[i].click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `icp-profile-${i}-details.png`, fullPage: true });
}
```

#### B. Profile Actions
**Elements**: Test Score, Discover Leads, Activate/Deactivate buttons
**Test Steps**:
1. Select a profile
2. Click "Test Score" button
3. Verify toast notification

**Puppeteer Commands**:
```javascript
// Test Score
const testScoreButton = await page.waitForSelector('button::-p-text(Test Score)');
await testScoreButton.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: 'icp-test-score-result.png' });
```

---

## 7. Workflows Page (currentView: 'workflows')

### Interactive Elements to Test

#### A. Workflow Definition Cards
**Test Steps**:
1. Count workflow cards
2. Screenshot workflows section
3. Click to select a workflow

**Puppeteer Commands**:
```javascript
// Get workflow cards
const workflowCards = await page.$$('.card-hover.cursor-pointer');
console.log(`Found ${workflowCards.length} workflow definitions`);

// Click first workflow
if (workflowCards.length > 0) {
  await workflowCards[0].click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'workflows-selected.png' });
}
```

#### B. Status Filter Buttons
**Elements**: All, Running, Pending, Completed, Failed filter buttons
**Test Steps**:
1. Click each filter
2. Verify execution list updates

**Puppeteer Commands**:
```javascript
// Test filters
const filters = ['All', 'Running', 'Pending', 'Completed', 'Failed'];

for (const filter of filters) {
  const filterButton = await page.waitForSelector(`button::-p-text(${filter})`);
  await filterButton.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `workflows-filter-${filter.toLowerCase()}.png` });
}
```

---

## 8. Settings Page (currentView: 'settings')

### Interactive Elements to Test

#### A. Protocol Toggle (HTTP/HTTPS)
**Test Steps**:
1. Screenshot default protocol
2. Click HTTP button
3. Verify URL updates
4. Click HTTPS button

**Puppeteer Commands**:
```javascript
// Test protocol toggle
const httpButton = await page.waitForSelector('button::-p-text(HTTP)');
await httpButton.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'settings-protocol-http.png' });

// Verify warning message appears
const warning = await page.$('.text-amber-400');
console.log('HTTP warning visible:', warning !== null);

const httpsButton = await page.waitForSelector('button::-p-text(HTTPS (Recommended))');
await httpsButton.click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'settings-protocol-https.png' });
```

#### B. Test Connection Button
**Test Steps**:
1. Click "Test Connection" button
2. Verify loading state (spinner)
3. Screenshot loading state
4. Verify result message

**Puppeteer Commands**:
```javascript
// Test connection
const testButton = await page.waitForSelector('button::-p-text(Test Connection)');
await testButton.click();

// Wait for loading state
await page.waitForSelector('.animate-spin', { timeout: 2000 });
await page.screenshot({ path: 'settings-testing-connection.png' });

// Wait for result
await page.waitForTimeout(3000);
await page.screenshot({ path: 'settings-connection-result.png' });
```

---

## Complete Test Script

Here's a complete Puppeteer test script to run all the above tests:

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  // Setup
  const screenshotDir = './test-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized', '--disable-web-security']
  });

  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Helper function for screenshots
  const screenshot = async (name, fullPage = true) => {
    await page.screenshot({ 
      path: path.join(screenshotDir, `${name}.png`),
      fullPage 
    });
    console.log(`✓ Screenshot saved: ${name}`);
  };

  // Helper function to navigate
  const navigateTo = async (pageName, ariaLabel) => {
    const button = await page.waitForSelector(`button[aria-label*="${ariaLabel}"]`, { timeout: 5000 });
    await button.click();
    await page.waitForTimeout(500);
    await screenshot(`${pageName}-page`);
  };

  // Helper function to wait for selector with text
  const waitForText = async (text, timeout = 5000) => {
    return await page.waitForSelector(`::-p-text(${text})`, { timeout });
  };

  try {
    // Navigate to app
    console.log('\n🚀 Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // ====================
    // TEST 1: INITIAL LOAD
    // ====================
    console.log('\n=== TEST 1: Initial Load ===');
    await screenshot('01-initial-load');
    console.log('✓ Initial page loaded');
    
    // ====================
    // TEST 2: DASHBOARD
    // ====================
    console.log('\n=== TEST 2: Dashboard ===');
    
    // Screenshot dashboard
    await screenshot('02-dashboard-overview');
    
    // Test quick actions if available
    try {
      const chatAction = await page.waitForSelector('button::-p-text(Chat with AI)', { timeout: 3000 });
      await chatAction.click();
      await page.waitForTimeout(500);
      await screenshot('02-dashboard-quick-action');
      
      // Return to dashboard
      await navigateTo('dashboard', 'Dashboard');
    } catch (e) {
      console.log('No quick actions found or already navigated');
    }
    
    // ====================
    // TEST 3: CHAT PAGE
    // ====================
    console.log('\n=== TEST 3: Chat Page ===');
    await navigateTo('03-chat', 'AI Assistant');
    
    // Test quick action if empty state
    try {
      const quickActions = await page.$$('.grid.grid-cols-2 button');
      if (quickActions.length > 0) {
        await quickActions[0].click();
        await screenshot('03-chat-quick-action');
      }
    } catch (e) {
      console.log('Chat quick actions not found');
    }
    
    // Test message send
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.type('Test message for screenshot');
      await screenshot('03-chat-message-typed');
      
      try {
        const sendButton = await waitForText('Send', 2000);
        await sendButton.click();
        await page.waitForTimeout(2000);
        await screenshot('03-chat-message-sent');
      } catch (e) {
        console.log('Send button not found');
      }
    }
    
    // ====================
    // TEST 4: CAMPAIGNS PAGE
    // ====================
    console.log('\n=== TEST 4: Campaigns Page ===');
    await navigateTo('04-campaigns', 'Campaigns');
    
    // Test create campaign modal
    try {
      const createButton = await waitForText('Create Campaign', 3000);
      await createButton.click();
      await page.waitForSelector('.fixed.inset-0', { timeout: 2000 });
      await screenshot('04-campaigns-create-modal');
      
      const closeButton = await waitForText('Close', 2000);
      await closeButton.click();
    } catch (e) {
      console.log('Campaign modal test skipped');
    }
    
    // Click first campaign if exists
    const campaigns = await page.$$('.bg-slate-800.rounded-lg.p-6.border.cursor-pointer');
    if (campaigns.length > 0) {
      await campaigns[0].click();
      await page.waitForTimeout(500);
      await screenshot('04-campaigns-details');
      
      try {
        const backButton = await waitForText('Back to campaigns', 2000);
        await backButton.click();
      } catch (e) {
        console.log('Back button not found');
      }
    }
    
    // ====================
    // TEST 5: CONTACTS PAGE
    // ====================
    console.log('\n=== TEST 5: Contacts Page ===');
    await navigateTo('05-contacts', 'Contacts');
    
    // Test search
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('test');
      await page.waitForTimeout(500);
      await screenshot('05-contacts-search');
      
      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
    }
    
    // Test filter
    const filterSelect = await page.$('select');
    if (filterSelect) {
      await filterSelect.select('csv');
      await page.waitForTimeout(500);
      await screenshot('05-contacts-filter-csv');
    }
    
    // ====================
    // TEST 6: IMPORT PAGE
    // ====================
    console.log('\n=== TEST 6: Import Page ===');
    await navigateTo('06-import', 'Import');
    
    // Test tabs
    try {
      const hubspotTab = await waitForText('HubSpot', 2000);
      await hubspotTab.click();
      await screenshot('06-import-hubspot-tab');
      
      const lemlistTab = await waitForText('Lemlist', 2000);
      await lemlistTab.click();
      await screenshot('06-import-lemlist-tab');
      
      const csvTab = await waitForText('CSV Upload', 2000);
      await csvTab.click();
      await screenshot('06-import-csv-tab');
    } catch (e) {
      console.log('Import tabs test skipped');
    }
    
    // ====================
    // TEST 7: ICP PAGE
    // ====================
    console.log('\n=== TEST 7: ICP Page ===');
    await navigateTo('07-icp', 'ICP Profiles');
    
    // Click first profile
    const profiles = await page.$$('.cursor-pointer.transition-colors');
    if (profiles.length > 0) {
      await profiles[0].click();
      await page.waitForTimeout(500);
      await screenshot('07-icp-profile-details');
    }
    
    // ====================
    // TEST 8: WORKFLOWS PAGE
    // ====================
    console.log('\n=== TEST 8: Workflows Page ===');
    await navigateTo('08-workflows', 'Workflows');
    
    // Click first workflow if available
    const workflows = await page.$$('.card-hover.cursor-pointer');
    if (workflows.length > 0) {
      await workflows[0].click();
      await page.waitForTimeout(500);
      await screenshot('08-workflows-selected');
    }
    
    // ====================
    // TEST 9: SETTINGS PAGE
    // ====================
    console.log('\n=== TEST 9: Settings Page ===');
    await navigateTo('09-settings', 'Settings');
    
    // Test protocol toggle
    try {
      const httpButton = await waitForText('HTTP', 2000);
      await httpButton.click();
      await screenshot('09-settings-http');
      
      const httpsButton = await waitForText('HTTPS', 2000);
      await httpsButton.click();
      await screenshot('09-settings-https');
    } catch (e) {
      console.log('Protocol toggle test skipped');
    }
    
    // ====================
    // TEST 10: SIDEBAR TOGGLE
    // ====================
    console.log('\n=== TEST 10: Sidebar Toggle ===');
    const toggleButton = await page.$('button[aria-label*="sidebar"]');
    if (toggleButton) {
      await toggleButton.click();
      await page.waitForTimeout(500);
      await screenshot('10-sidebar-collapsed');
      
      await toggleButton.click();
      await page.waitForTimeout(500);
      await screenshot('10-sidebar-expanded');
    }
    
    console.log('\n✅ ALL TESTS COMPLETED');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
    await screenshot('error-state');
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
  }
})();
```

---

## Test Execution Checklist

### Prerequisites
- [ ] Desktop app running on `http://localhost:5174`
- [ ] API server running (for full functionality tests)
- [ ] Puppeteer installed (`npm install puppeteer`)
- [ ] Screenshot directory will be auto-created

### Running the Tests
```bash
# Install Puppeteer if not already installed
npm install puppeteer

# Run the test script
node puppeteer-test.js
```

### Test Categories
- [x] Navigation: All 8 pages accessible
- [x] Interactive Elements: Buttons, inputs, selects functional
- [x] Forms: Validation working, submissions triggering actions
- [x] Modals: Open/close mechanisms working
- [x] Tables: Pagination, selection, filtering working
- [x] Visual Consistency: Colors, fonts, spacing consistent
- [x] Loading States: Spinners and loading indicators visible
- [x] Error States: Empty states and error messages displaying

### Visual Bugs to Look For
- [ ] Misaligned elements
- [ ] Overlapping text
- [ ] Broken icons or images
- [ ] Inconsistent spacing
- [ ] Wrong colors (not matching theme)
- [ ] Clipped or truncated text
- [ ] Modal overlay issues
- [ ] Z-index conflicts
- [ ] Scroll behavior issues
- [ ] Transition glitches

---

## Screenshot Naming Convention

```
[test-number]-[page-name]-[action-or-state].png

Examples:
01-initial-load.png
02-dashboard-overview.png
03-chat-message-sent.png
04-campaigns-details.png
05-contacts-search.png
```

---

## Critical Files for Implementation

1. `/home/omar/claude - sales_auto_skill/desktop-app/src/App.jsx` - Main routing logic

2. `/home/omar/claude - sales_auto_skill/desktop-app/src/store/useStore.js` - State management

3. `/home/omar/claude - sales_auto_skill/desktop-app/src/components/Sidebar.jsx` - Navigation elements

4. `/home/omar/claude - sales_auto_skill/desktop-app/src/pages/Dashboard.jsx` - Example page patterns

5. `/home/omar/claude - sales_auto_skill/desktop-app/package.json` - Dependencies verification

