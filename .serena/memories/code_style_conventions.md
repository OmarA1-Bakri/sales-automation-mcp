# Code Style and Conventions

## Language
- **TypeScript/JavaScript**: ES Modules (`import`/`export`)
- **React**: JSX syntax
- **File Encoding**: UTF-8

## Module System
- Use ES6 `import`/`export` statements
- File extension: `.js` for Node.js (type: "module" in package.json)
- File extension: `.jsx` for React components

## Code Organization

### Backend (mcp-server)
- **Classes**: PascalCase (e.g., `SalesAutomationAPIServer`, `HubSpotClient`)
- **Functions**: camelCase (e.g., `setupMiddleware`, `executeWorkflow`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants, camelCase for config objects
- **File names**: kebab-case (e.g., `api-server.js`, `hubspot-client.js`)

### Frontend (desktop-app)
- **React Components**: PascalCase files and function names (e.g., `Dashboard.jsx`, `function Dashboard()`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useStore`)
- **Props**: PropTypes for runtime validation
- **State**: Zustand for global state management

## Naming Conventions

### Backend
- **Endpoints**: RESTful, lowercase with hyphens (e.g., `/api/campaigns`, `/api/yolo/enable`)
- **Database tables**: snake_case (e.g., `campaign_events`, `imported_contacts`)
- **Model fields**: snake_case in DB, camelCase in code
- **Event names**: dot.separated.lowercase (e.g., `automation.enrich.started`)

### Frontend
- **CSS classes**: Tailwind utility classes
- **Component props**: camelCase
- **Event handlers**: `on` prefix (e.g., `onClick`, `onSubmit`)

## Code Structure

### React Components
```jsx
import React from 'react';
import PropTypes from 'prop-types';

function ComponentName({ prop1, prop2 }) {
  // Component logic
  return (
    <div className="tailwind-classes">
      {/* JSX */}
    </div>
  );
}

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default ComponentName;
```

### Backend Classes
```js
class ClassName {
  constructor(options = {}) {
    this.property = options.property;
  }

  async methodName() {
    // Implementation
  }
}

export { ClassName };
```

## Documentation

### JSDoc Comments
- **Classes**: Document purpose and key features
- **Methods**: Document parameters and return values for complex logic
- **Configuration**: Document middleware layers with CRITICAL notes for security

### Inline Comments
- Use for complex logic explanations
- Security-critical code has detailed comments
- Event flow and automation logic is well-documented

## Error Handling

### Backend
```js
try {
  // Operation
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  res.status(500).json({
    success: false,
    error: error.message,
  });
}
```

### Frontend
```js
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  toast.error(error.message || 'Something went wrong');
}
```

## Logging

### Backend
- Use structured logging via `createLogger('Component')`
- Log levels: info, warn, error
- Include context objects (e.g., `{ jobId, type }`)
- Security-sensitive data is NOT logged (API keys, credentials)

### Frontend
- Use `console.log`, `console.warn`, `console.error`
- Toast notifications for user feedback

## Security Practices
- **API Keys**: Stored in `.env`, never hardcoded or logged
- **Input Validation**: Zod schemas for all API endpoints
- **Rate Limiting**: Global (100 req/15min) + Chat-specific (10 msg/min)
- **Prototype Pollution Protection**: Middleware blocks `__proto__` keys
- **Security Headers**: Helmet middleware (CSP, HSTS, etc.)
- **CORS**: Strict origin validation
- **Authentication**: API key middleware for `/api/*` routes

## Testing Conventions
- Test files: `*.test.js` or `*.spec.js`
- Jest configuration in `jest.config.js`
- Coverage threshold: 80% for branches, functions, lines, statements
- Integration tests in `mcp-server/tests/integration/`

## Git Conventions
- **Branches**: Not specified in codebase
- **Commits**: Descriptive messages with context
- **Ignored files**: `.env`, `node_modules/`, logs, build artifacts