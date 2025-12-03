# E2E Test Coverage Matrix

## Overview

This document maps all application features to the persona-based tests that validate them. Use this matrix to:
- Identify which tests cover specific features
- Find gaps in test coverage
- Determine which personas to run for targeted testing

## Personas Summary

| ID | Persona | Role | Proficiency | Primary Focus |
|----|---------|------|-------------|---------------|
| P1 | Sarah Chen | Sales Operations Manager | 5/5 (Expert) | Configuration, ICP setup, YOLO mode |
| P2 | Marcus Johnson | Account Executive | 3/5 (Intermediate) | Daily prospecting, AI chat, contacts |
| P3 | Elena Rodriguez | Marketing Operations | 4/5 (Advanced) | Campaign creation, analytics, A/B tests |
| P4 | David Park | VP of Sales | 2/5 (Basic) | Quick metrics, performance, YOLO status |
| P5 | Alex Thompson | New SDR | 1/5 (Beginner) | Onboarding, exploration, learning |

## Coverage Matrix

### Dashboard Features

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| View metrics cards | | ✅ | | ✅ | ✅ | HIGH |
| Quick actions | | ✅ | | | | MEDIUM |
| Activity feed | | ✅ | | | | MEDIUM |
| YOLO status display | | | | ✅ | ✅ | HIGH |
| First-time experience | | | | | ✅ | LOW |
| Performance metrics | | | ✅ | ✅ | | HIGH |

**Test Flows:**
- `P2: Morning Dashboard Review`
- `P4: 30-Second Executive Dashboard Check`
- `P5: First Time Dashboard Experience`

---

### AI Assistant / Chat

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| Send message | ✅ | ✅ | | | ✅ | HIGH |
| Quick action buttons | | ✅ | | | ✅ | HIGH |
| Lead discovery | | ✅ | | | | MEDIUM |
| Enrichment requests | | ✅ | | | | MEDIUM |
| Pipeline stats | | ✅ | | | | MEDIUM |
| Onboarding help | | | | | ✅ | LOW |
| YOLO explanation | | | | | ✅ | LOW |
| Tool use (function calls) | ✅ | ✅ | | | | MEDIUM |

**Test Flows:**
- `P2: Discover Leads via AI Chat`
- `P2: Check Pipeline Stats via AI`
- `P5: Ask AI Assistant for Guidance`
- `P5: Explore AI Quick Actions`

---

### Contacts Management

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| View contact list | ✅ | ✅ | | ✅ | ✅ | HIGH |
| Search contacts | | ✅ | | | ✅ | HIGH |
| Filter by source | | ✅ | | | | MEDIUM |
| View contact details | | ✅ | | | | MEDIUM |
| Bulk selection | | ✅ | | | | MEDIUM |
| Export contacts | | ✅ | | | | LOW |
| Empty state handling | | | | | ✅ | MEDIUM |

**Test Flows:**
- `P2: Review Contacts List`
- `P2: View Contact Details`
- `P2: Select Multiple Contacts`
- `P5: Experience Empty States`

---

### CSV Import

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| Upload CSV file | ✅ | | | | | MEDIUM |
| Field mapping | ✅ | | | | | MEDIUM |
| Preview data | ✅ | | | | | LOW |
| Execute import | ✅ | | | | | MEDIUM |
| View import page | | | | | ✅ | LOW |

**Test Flows:**
- `P1: Bulk CSV Import`
- `P5: Explore Import Page`

---

### Campaigns

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| View campaigns list | | | ✅ | ✅ | | HIGH |
| Create email campaign | | | ✅ | | | HIGH |
| Create LinkedIn campaign | | | ✅ | | | HIGH |
| Create video campaign | | | ✅ | | | MEDIUM |
| Edit campaign | | | ✅ | | | MEDIUM |
| Template variables | | | ✅ | | | MEDIUM |
| A/B testing setup | | | ✅ | | | LOW |
| Campaign analytics | | | ✅ | | | HIGH |

**Test Flows:**
- `P3: View Campaigns Dashboard`
- `P3: Create Email Campaign`
- `P3: Create LinkedIn Campaign`
- `P3: Create Video Campaign`
- `P3: A/B Test Setup`
- `P4: Quick Campaigns Status`

---

### ICP Profiles

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| View profiles list | ✅ | | | | ✅ | HIGH |
| Create ICP profile | ✅ | | | | | HIGH |
| Configure criteria | ✅ | | | | | HIGH |
| Set scoring weights | ✅ | | | | | MEDIUM |
| Test ICP scoring | ✅ | | | | | MEDIUM |
| Profile details view | | | | | ✅ | LOW |

**Test Flows:**
- `P1: Navigate to ICP Profiles`
- `P1: Create Core ICP Profile`
- `P1: Create Expansion Market ICP`
- `P1: Test ICP Scoring`
- `P5: Browse ICP Profiles`

---

### Settings

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| API key configuration | ✅ | | | | | MEDIUM |
| Email provider setup | ✅ | | | | | MEDIUM |
| Enrichment provider | ✅ | | | | | MEDIUM |
| Provider toggles | ✅ | | | | | LOW |
| View settings | | | | | ✅ | LOW |

**Test Flows:**
- `P1: Full Settings Configuration`
- `P5: Explore Settings Page`

---

### YOLO Automation Mode

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| Enable YOLO | ✅ | | | | | HIGH |
| Disable YOLO | ✅ | | | | | HIGH |
| View status | | | | ✅ | ✅ | HIGH |
| Emergency pause | | | | ✅ | | MEDIUM |
| Resume after pause | | | | ✅ | | MEDIUM |
| Configure settings | ✅ | | | | | LOW |

**Test Flows:**
- `P1: Enable YOLO Mode`
- `P1: Disable YOLO Mode`
- `P4: Verify YOLO Mode Running`
- `P4: Emergency YOLO Pause`
- `P4: Resume YOLO Mode`

---

### Performance & Analytics

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| View performance page | | | ✅ | ✅ | | HIGH |
| Campaign analytics | | | ✅ | | | HIGH |
| Export reports | | | ✅ | | | MEDIUM |
| Charts/visualizations | | | ✅ | ✅ | | MEDIUM |

**Test Flows:**
- `P3: View Campaign Analytics`
- `P3: Export Performance Report`
- `P4: Quick Performance Page Glance`

---

### Navigation & UX

| Feature | P1 | P2 | P3 | P4 | P5 | Coverage |
|---------|:--:|:--:|:--:|:--:|:--:|----------|
| Sidebar navigation | | | | | ✅ | HIGH |
| Fast page transitions | | | | ✅ | | HIGH |
| Back button support | | | | | ✅ | MEDIUM |
| Random navigation | | | | | ✅ | MEDIUM |
| Loading states | | | | ✅ | | MEDIUM |

**Test Flows:**
- `P4: Fast Navigation Between Pages`
- `P5: Explore All Sidebar Items`
- `P5: Test Back Navigation`
- `P5: Random Navigation (edge case)`

---

## Edge Cases Coverage

| Scenario | Persona | Flow Name |
|----------|---------|-----------|
| Empty search results | P2, P5 | Empty Contact List, Experience Empty States |
| API timeout | P4 | API Timeout (edge case) |
| Rate limiting | P2 | AI Chat Rate Limit |
| Form validation | P1, P5 | ICP Validation, Empty Form Submission |
| Session timeout | P4 | Session Timeout During Use |
| Slow network | P4 | Slow Network Simulation |
| Rapid clicks | P5 | Rapid Click Actions |
| Long idle session | P5 | Long Idle Session |
| Long chat message | P2 | Long Chat Message |

---

## Performance Requirements

| Metric | Target | Tested By |
|--------|--------|-----------|
| Dashboard load | < 3 seconds | P4 |
| Navigation transition | < 1 second | P4 |
| Metrics render | < 2 seconds | P4 |
| YOLO toggle response | < 2 seconds | P4 |
| Page interactive | < 5 seconds | P4 |

---

## Running Tests

### Full Test Suite
```bash
npm run test:e2e
```

### By Persona
```bash
npm run test:e2e -- --grep "Persona 1"
npm run test:e2e -- --grep "Persona 2"
npm run test:e2e -- --grep "Persona 3"
npm run test:e2e -- --grep "Persona 4"
npm run test:e2e -- --grep "Persona 5"
```

### By Priority
```bash
npm run test:e2e -- --grep "critical"
npm run test:e2e -- --grep "high"
```

### Smoke Tests Only
```bash
npm run test:e2e:smoke
```

---

## Coverage Gaps & Recommendations

### Low Coverage Areas (Need More Tests)
1. **Export functionality** - Only tested in P3, add export tests to P1/P2
2. **Video campaigns** - Limited to P3, consider cross-persona testing
3. **Settings persistence** - Only P1 tests settings, add validation in others
4. **Error recovery** - Add more error state tests across personas

### Recommended Additions
1. Add authentication/login flow tests
2. Add data persistence validation after page refresh
3. Add cross-browser testing configuration
4. Add mobile viewport tests

---

## Test Data Dependencies

| Persona | Required Seed Data |
|---------|-------------------|
| P1 | Empty or minimal (creates own data) |
| P2 | ICP profiles, some contacts |
| P3 | ICP profiles, contacts, campaign templates |
| P4 | Full dataset with metrics |
| P5 | Empty or minimal (tests empty states) |

Run seed script before P2-P4 tests:
```bash
node tests/e2e/fixtures/seed-runner.js seed
```

Clean up after tests:
```bash
node tests/e2e/fixtures/seed-runner.js cleanup
```
