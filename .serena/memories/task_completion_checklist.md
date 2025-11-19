# Task Completion Checklist

## Before Committing Code

### 1. Code Quality
- [ ] Code follows ES6 module syntax
- [ ] Naming conventions are consistent (camelCase for functions, PascalCase for classes/components)
- [ ] No console.log statements in production code (use logger instead)
- [ ] PropTypes defined for all React components
- [ ] Error handling implemented with try/catch and proper logging
- [ ] Security: No hardcoded API keys or credentials
- [ ] Security: Input validation with Zod schemas for API endpoints
- [ ] Comments added for complex logic

### 2. Testing
- [ ] Run test suite: `npm test` (in mcp-server/)
- [ ] All tests passing
- [ ] Coverage threshold met (80%)
- [ ] Integration tests updated if needed

### 3. Linting & Formatting
**Note**: No ESLint or Prettier configured in this project
- [ ] Code manually reviewed for style consistency
- [ ] Import statements organized
- [ ] Consistent indentation (2 spaces)

### 4. Database Changes
If database schema was modified:
- [ ] Migration created: `npm run db:migrate`
- [ ] Migration tested
- [ ] Models updated in `mcp-server/src/models/`

### 5. API Changes
If API endpoints were added/modified:
- [ ] Validation schema added/updated in `validation-schemas.js`
- [ ] Authentication middleware applied
- [ ] Rate limiting considered
- [ ] WebSocket events broadcasted if needed
- [ ] Documentation updated

### 6. Frontend Changes
If React components were modified:
- [ ] PropTypes validation added
- [ ] State management updated (Zustand)
- [ ] Toast notifications for user feedback
- [ ] Responsive design (Tailwind classes)
- [ ] Accessibility considerations

### 7. Documentation
- [ ] README.md updated if needed
- [ ] JSDoc comments for new classes/methods
- [ ] CHANGELOG.md updated with changes
- [ ] Inline comments for complex logic

### 8. Security Review
- [ ] No prototype pollution vulnerabilities
- [ ] API keys secured in .env
- [ ] CORS configured properly
- [ ] Rate limiting in place
- [ ] Input sanitization implemented
- [ ] SQL injection prevention (Sequelize ORM)
- [ ] XSS prevention (React auto-escaping)

### 9. Performance
- [ ] Database queries optimized
- [ ] N+1 queries avoided
- [ ] Unnecessary API calls eliminated
- [ ] WebSocket events not spammed
- [ ] Memory leaks checked

### 10. Manual Testing
- [ ] Feature tested locally
- [ ] Happy path verified
- [ ] Error cases handled
- [ ] Desktop app UI tested (if frontend changes)
- [ ] API endpoints tested with curl/Postman

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Environment variables documented in .env.example
- [ ] Database migrations ready
- [ ] Docker build successful (if using Docker)

### Deployment
- [ ] Pull latest code
- [ ] Run migrations: `npm run db:migrate`
- [ ] Install dependencies: `npm install`
- [ ] Build desktop app: `npm run build` (if needed)
- [ ] Restart services: `./rtgs-sales-automation.sh`

### Post-Deployment
- [ ] Health check: `curl http://localhost:3000/health`
- [ ] Monitor logs: `tail -f logs/mcp-server.log`
- [ ] Verify WebSocket connection
- [ ] Test critical workflows
- [ ] Monitor error rates

## YOLO Mode Checklist

If YOLO Mode was modified:
- [ ] Cron schedules verified
- [ ] Job queue processing tested
- [ ] Autonomous workflows tested end-to-end
- [ ] Safety guardrails in place (rate limits, daily caps)
- [ ] Emergency stop functionality working
- [ ] Activity monitoring functional

## Integration Checklist

If integrations were modified:
- [ ] API keys configured in .env
- [ ] Rate limits respected
- [ ] Error handling for API failures
- [ ] Retry logic implemented
- [ ] Cache strategy considered
- [ ] Health check endpoints working

## Troubleshooting Commands

### Check Running Processes
```bash
ps aux | grep node
```

### Kill Stuck Processes
```bash
./stop.sh
```

### Clear Logs
```bash
rm logs/*.log
```

### Reset Database (Development Only)
```bash
rm mcp-server/.sales-automation/sales-automation.db
cd mcp-server && npm run db:migrate
```

### Check API Health
```bash
curl http://localhost:3000/health
```