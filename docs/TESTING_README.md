# Puppeteer Visual UI/UX Testing

## Quick Start

### Prerequisites
1. Desktop app running on `http://localhost:5174`
2. Node.js and npm installed
3. Puppeteer installed

### Installation
```bash
npm install puppeteer
```

### Running Tests
```bash
# Run the automated test script
node puppeteer-visual-test.js
```

## Files Created

1. **PUPPETEER_TESTING_PLAN.md** - Complete testing plan with detailed test scenarios for all 8 pages
2. **puppeteer-visual-test.js** - Executable test script that runs all basic navigation tests
3. **TESTING_README.md** - This file (quick reference guide)

## Test Output

All screenshots will be saved to `./test-screenshots/` directory with descriptive names:
- `01-initial-load.png`
- `02-dashboard-overview.png`
- `03-chat-page.png`
- etc.

## What Gets Tested

### Basic Navigation (Automated Script)
- All 8 pages are accessible via sidebar
- Each page loads correctly
- Screenshots captured for visual verification

### Advanced Testing (See PUPPETEER_TESTING_PLAN.md)
- Interactive elements (buttons, inputs, forms)
- Modals (open/close)
- Tables (pagination, filtering, selection)
- Form validation
- Loading states
- Error states
- Responsive viewports

## Manual Testing Checklist

After running the automated script, manually review screenshots for:

- [ ] Visual consistency (colors, fonts, spacing)
- [ ] No misaligned elements
- [ ] No overlapping text
- [ ] Icons render correctly
- [ ] Hover states work
- [ ] Loading spinners visible
- [ ] Error messages clear
- [ ] Empty states helpful

## Extending Tests

The `puppeteer-visual-test.js` script is a starting point. To add more comprehensive tests:

1. Review the detailed scenarios in `PUPPETEER_TESTING_PLAN.md`
2. Add test code from the plan to the script
3. Customize for your specific testing needs

## Troubleshooting

### App not loading
- Verify app is running on http://localhost:5174
- Check console for errors

### Screenshots appear blank
- Increase timeout values
- Check for JavaScript errors in page console

### Selectors not found
- Use browser DevTools to verify element selectors
- Update selectors in test script as needed

## Best Practices

1. Run tests with app in known state (fresh start)
2. Review screenshots after each test run
3. Document any visual bugs found
4. Compare screenshots across test runs to catch regressions

