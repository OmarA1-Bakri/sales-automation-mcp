# ROOT CAUSE FOUND - Test Database Mismatch

**Date**: 2025-11-10
**Issue**: Tests failing with 500 errors
**Root Cause**: Controller uses production PostgreSQL models, tests use SQLite models

---

## The Problem (Traced Backwards)

### 1. Test sends HTTP request
**File**: `tests/campaigns-webhooks.test.js`
```javascript
const response = await request(app)
  .post('/api/campaigns/events/webhook')
  .send(eventPayload);
// Returns 500 error
```

### 2. Request reaches controller
**File**: `src/controllers/campaign-controller.js`
- Controller logs "Event creation requested" ✅
- Then crashes silently ❌

### 3. Controller imports models from index
**File**: `src/controllers/campaign-controller.js:6-15`
```javascript
import {
  CampaignTemplate,
  CampaignInstance,
  // ...
} from '../models/index.js';
```

### 4. Models index imports production database
**File**: `src/models/index.js:9`
```javascript
import { sequelize } from '../db/connection.js';
```

### 5. Database connection creates PostgreSQL client
**File**: `src/db/connection.js:45-80`
```javascript
const sequelize = new Sequelize(
  config.database,  // PostgreSQL database
  config.user,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'postgres',  // ← PRODUCTION DATABASE
    // ...
  }
);
```

### 6. Test creates SQLite database
**File**: `tests/helpers/test-server.js:20`
```javascript
const sequelize = new Sequelize('sqlite::memory:', {
  dialect: 'sqlite',  // ← TEST DATABASE
  // ...
});
```

## The Mismatch

```
┌─────────────────────────────────────────────────────┐
│                  PRODUCTION FLOW                    │
├─────────────────────────────────────────────────────┤
│  Controller                                         │
│      ↓                                              │
│  imports from src/models/index.js                   │
│      ↓                                              │
│  uses src/db/connection.js                          │
│      ↓                                              │
│  PostgreSQL Database                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    TEST FLOW                        │
├─────────────────────────────────────────────────────┤
│  Test creates SQLite database                       │
│      ↓                                              │
│  Test server mounts production routes               │
│      ↓                                              │
│  Routes call controller                             │
│      ↓                                              │
│  Controller uses PostgreSQL models (WRONG!)         │
│      ↓                                              │
│  Crash - trying to query PostgreSQL with no connection│
└─────────────────────────────────────────────────────┘
```

**Result**: Controller tries to query PostgreSQL (which isn't running in tests), crashes with no connection.

---

## Why It Fails Silently

The controller probably crashes when trying to do database operations like:
```javascript
await CampaignEvent.findOrCreate({...})
```

Because `CampaignEvent` model is bound to PostgreSQL sequelize instance, but:
- PostgreSQL isn't running in test mode
- OR PostgreSQL connection times out
- Error gets caught by async handler but not logged properly

---

## Solutions (Ranked by Feasibility)

### Solution 1: Use Dependency Injection (RECOMMENDED)

**Make the controller accept models as parameters instead of importing them**

**Changes needed**:

1. Modify controller to accept models:
```javascript
// src/controllers/campaign-controller.js
export function createController(models) {
  return {
    async createEvent(req, res) {
      const { CampaignEvent, CampaignEnrollment } = models;
      // Use injected models instead of imported ones
    }
  };
}
```

2. Modify routes to inject models:
```javascript
// src/routes/campaigns.js
export function createRoutes(models) {
  const router = express.Router();
  const controller = createController(models);

  router.post('/events/webhook', controller.createEvent);
  return router;
}
```

3. Production uses production models:
```javascript
// src/api-server.js
import * as productionModels from './models/index.js';
const routes = createRoutes(productionModels);
app.use('/api/campaigns', routes);
```

4. Tests use test models:
```javascript
// tests/helpers/test-server.js
const testModels = getTestModels(sequelize);
const routes = createRoutes(testModels);
app.use('/api/campaigns', routes);
```

**Pros**: Clean, testable, proper separation of concerns
**Cons**: Requires refactoring controller and routes (2-3 hours work)

---

### Solution 2: Mock src/models/index.js in Tests

**Use Jest to mock the models import**

**Changes needed**:

```javascript
// tests/setup.js or tests/campaigns-webhooks.test.js
jest.mock('../src/models/index.js', () => {
  const testSequelize = new Sequelize('sqlite::memory:', {...});
  const models = initializeTestModels(testSequelize);
  return models;
});
```

**Pros**: No changes to production code
**Cons**: Mocking entire modules is brittle, hard to maintain

---

### Solution 3: Conditional Import in Models Index

**Make src/models/index.js use test database when NODE_ENV=test**

**Changes needed**:

```javascript
// src/models/index.js
let sequelize;
if (process.env.NODE_ENV === 'test') {
  // Import from a global test sequelize instance
  sequelize = global.__TEST_SEQUELIZE__;
} else {
  // Import production sequelize
  import { sequelize as prodSequelize } from '../db/connection.js';
  sequelize = prodSequelize;
}
```

**Pros**: Minimal changes
**Cons**: Global variables, tight coupling between test and production code

---

### Solution 4: Create Test-Specific Routes

**Don't use production routes in tests, create simplified test routes**

**Changes needed**:

```javascript
// tests/helpers/test-routes.js
import express from 'express';

export function createTestRoutes(models) {
  const router = express.Router();

  router.post('/events/webhook', async (req, res) => {
    // Simplified controller logic using test models
    const { CampaignEvent } = models;
    const event = await CampaignEvent.create(req.body);
    res.status(201).json({ success: true, data: event });
  });

  return router;
}
```

**Pros**: Tests are isolated from production code changes
**Cons**: Tests don't validate actual controller logic

---

## Recommended Approach

**Solution 1 (Dependency Injection)** is the cleanest long-term fix because:
1. Makes code more testable
2. Follows SOLID principles
3. Prevents this type of bug in the future
4. Allows easy swapping of different database implementations

**Estimated Time**: 3-4 hours to refactor controller and routes

---

## Quick Fix for Immediate Testing

While implementing Solution 1, you can:
1. Add better error logging in the controller to see the actual crash
2. Run PostgreSQL in Docker for tests (use same database as production)
3. Skip database tests for now, focus on unit tests

---

## Files That Need Changes (Solution 1)

1. `src/controllers/campaign-controller.js` - Accept models as dependency
2. `src/routes/campaigns.js` - Accept models, pass to controller
3. `src/api-server.js` - Pass production models to routes
4. `tests/helpers/test-server.js` - Pass test models to routes

---

## Why Previous "Fix" Didn't Work

I successfully:
- ✅ Wired up routes in test server
- ✅ Bypassed webhook authentication

But the fundamental issue remained:
- ❌ Controller still uses wrong database connection
- ❌ No way for test server to override model imports

The routes ARE working (request reaches controller), but controller crashes when trying to use models bound to non-existent PostgreSQL connection.

---

## Next Steps

1. Decide which solution to implement
2. If Solution 1: Start with controller refactoring
3. If quick fix: Add error logging to see actual crash
4. Update tests to verify fix works

---

**Bottom Line**: The controller and test infrastructure are using different databases. Need to inject test models into controller, or make controller use test database connection.
