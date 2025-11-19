# Available Testing Tools for RTGS Sales Automation

Based on the plugins and Claude skills available, here are the tools you can use for comprehensive testing:

## 🧪 Testing & QA Plugins

### 1. **API Testing**
**Plugin:** `api-test-automation`
**Skill:** `/api-test`
**Use for:**
- Test all MCP Server endpoints
- Validate API responses
- Check error handling
- Load testing API calls
- Integration testing

**Example:**
```bash
# Test MCP Server health endpoint
curl http://localhost:3456/health

# Test YOLO mode endpoints
curl -X POST http://localhost:3456/api/yolo/status
```

### 2. **Performance Testing**
**Plugin:** `performance-test-suite`
**Skill:** `/performance-test`
**Use for:**
- Load testing the MCP server
- Benchmarking API response times
- Memory usage analysis
- Identifying bottlenecks
- Stress testing YOLO mode

**What to test:**
- Concurrent YOLO cycles
- Bulk contact imports
- Database query performance
- WebSocket connections

### 3. **Security Testing**
**Plugin:** `security-test-scanner`
**Skill:** `/security-scan`
**Use for:**
- OWASP compliance validation
- Vulnerability scanning
- API security testing
- Input validation testing
- SQL injection prevention

**Critical areas:**
- API key storage (.env file)
- Database queries (SQLite)
- Input sanitization
- Rate limiting effectiveness

### 4. **Database Testing**
**Plugin:** `database-test-manager`
**Skill:** `/db-test`
**Use for:**
- Test data setup
- Transaction rollback testing
- Schema validation
- Query optimization
- Data integrity checks

**Test scenarios:**
- YOLO activity logging
- Job queue operations
- Enrichment cache
- Contact deduplication

### 5. **Smoke Testing**
**Plugin:** `smoke-test-runner`
**Skill:** `/smoke-test`
**Use for:**
- Quick critical functionality checks
- Post-deployment validation
- Health check verification
- Basic workflow testing

**Quick smoke tests:**
```bash
# 1. MCP Server responds
curl http://localhost:3456/health

# 2. Desktop app loads
curl http://localhost:5173

# 3. Database exists
ls -lah .sales-automation/*.db

# 4. Dependencies installed
cd mcp-server && npm list --depth=0
cd ../desktop-app && npm list --depth=0
```

### 6. **Integration Testing**
**Plugin:** `test-orchestrator`
**Skill:** `/orchestrate`
**Use for:**
- End-to-end workflow testing
- Multi-service integration
- YOLO mode cycle testing
- Worker coordination testing

**Test flows:**
```
1. Discovery → Enrichment → Sync → Outreach
2. Import CSV → Validate → Store → Display
3. Enable YOLO → Run Cycle → Check Results
4. API Call → Worker Process → Database Store
```

## 📊 Monitoring & Analysis Plugins

### 7. **Test Report Generation**
**Plugin:** `test-report-generator`
**Skill:** `/gen-report`
**Use for:**
- Generate comprehensive test reports
- Coverage analysis
- Trend visualization
- CI/CD integration

### 8. **Mutation Testing**
**Plugin:** `mutation-test-runner`
**Skill:** `/mutation-test`
**Use for:**
- Validate test quality
- Find untested code paths
- Improve test coverage

## 🎯 Specialized Testing

### 9. **Browser Compatibility**
**Plugin:** `browser-compatibility-tester`
**Skill:** `/browser-test`
**Use for:**
- Test desktop app in different browsers
- Electron compatibility
- Cross-platform validation

**Test on:**
- Chrome (Electron uses Chromium)
- Firefox (alternative test)
- Safari (macOS)

### 10. **Load Balancer Testing**
**Plugin:** `load-balancer-tester`
**Skill:** `/lb-test`
**Use for:**
- Test multiple concurrent users
- Distribution of API requests
- Failover scenarios

### 11. **API Fuzzing**
**Plugin:** `api-fuzzer`
**Skill:** `/fuzz-api`
**Use for:**
- Test with malformed inputs
- Edge case discovery
- Security vulnerability detection
- Input validation testing

### 12. **Chaos Engineering**
**Plugin:** `chaos-engineering-toolkit`
**Skill:** (available via plugin)
**Use for:**
- System resilience testing
- Failure recovery testing
- Fault injection

## 🔧 Development Testing Tools

### 13. **Test Data Generator**
**Plugin:** `test-data-generator`
**Skill:** `/generate-data`
**Use for:**
- Generate realistic test contacts
- Create mock API responses
- Generate test campaigns
- Populate test database

**Example data needed:**
```javascript
// Generate 100 test contacts
{
  email: "test1@example.com",
  firstName: "John",
  lastName: "Doe",
  title: "VP of Finance",
  company: "Acme Corp"
}
```

### 14. **Test Doubles Generator**
**Plugin:** `test-doubles-generator`
**Skill:** `/gen-doubles`
**Use for:**
- Create mocks for API clients
- Stub external services
- Generate test fixtures
- Spy on function calls

### 15. **Snapshot Testing**
**Plugin:** `snapshot-test-manager`
**Skill:** `/snapshot-manager`
**Use for:**
- UI component snapshot testing
- API response snapshots
- Database state snapshots
- Regression detection

## 📋 Recommended Testing Strategy

### Phase 1: Basic Validation (Use Now)
```bash
# Already have:
./test-local.sh           # ✅ Dependency and syntax checks

# Add:
/smoke-test              # Quick critical path validation
/api-test                # API endpoint testing
```

### Phase 2: Comprehensive Testing
```bash
/performance-test        # Load and stress testing
/security-scan           # Security vulnerability scan
/db-test                 # Database integrity tests
```

### Phase 3: Advanced Testing
```bash
/orchestrate             # Full integration tests
/fuzz-api                # Edge case testing
/mutation-test           # Test quality validation
```

## 🎯 Specific Test Scenarios for RTGS

### 1. MCP Server Tests
```bash
# Use: /api-test
Test all endpoints:
- GET /health
- POST /api/yolo/enable
- POST /api/yolo/status
- POST /api/discover
- POST /api/enrich
- POST /api/outreach
- GET /api/jobs
- POST /api/execute
```

### 2. YOLO Mode Tests
```bash
# Use: /orchestrate
Test full cycle:
1. Enable YOLO mode
2. Trigger discovery cycle
3. Check database for results
4. Verify stats updated
5. Check activity log
6. Disable YOLO mode
```

### 3. Desktop App Tests
```bash
# Use: /browser-test
Test UI:
- Dashboard loads
- Navigation works
- YOLO button toggles
- Stats display correctly
- Activity feed updates
```

### 4. Database Tests
```bash
# Use: /db-test
Test operations:
- Job creation and retrieval
- Enrichment cache
- YOLO activity logging
- Contact deduplication
- Rate limit tracking
```

### 5. Security Tests
```bash
# Use: /security-scan
Check:
- API key exposure
- SQL injection prevention
- Input validation
- Rate limiting
- CORS configuration
```

### 6. Performance Tests
```bash
# Use: /performance-test
Benchmark:
- API response times
- Database query speed
- Concurrent YOLO cycles
- Import processing speed
- Memory usage under load
```

### 7. Integration Tests
```bash
# Use: /orchestrate
Test workflows:
- Import → Enrich → Sync → Outreach
- Enable YOLO → Run → Monitor → Disable
- API → Worker → Database → Response
```

## 🚀 Quick Start Testing

### Immediate: Run Basic Tests
```bash
# 1. Syntax and dependencies
./test-local.sh

# 2. Start the app
./rtgs-sales-automation.sh

# 3. Smoke test
curl http://localhost:3456/health
curl http://localhost:5173

# 4. Check logs
tail -f logs/mcp-server.log
tail -f logs/desktop-app.log
```

### Next: Use Claude Skills
```bash
# In Claude Code, run:
/smoke-test              # Quick validation
/api-test                # API endpoint tests
/security-scan           # Security check
/performance-test        # Load testing
```

### Advanced: Full Test Suite
```bash
# Use multiple skills in parallel:
/api-test
/db-test
/security-scan
/performance-test
/orchestrate
```

## 📊 Test Coverage Goals

### Must Have (Critical) ✅
- [x] Dependency installation
- [x] Syntax validation
- [ ] API endpoint tests
- [ ] Database operations
- [ ] YOLO mode cycle

### Should Have (Important)
- [ ] Performance benchmarks
- [ ] Security scan
- [ ] Integration tests
- [ ] Error handling

### Nice to Have (Optional)
- [ ] Mutation testing
- [ ] Chaos engineering
- [ ] Load balancer tests
- [ ] Browser compatibility

## 💡 Pro Tips

1. **Start Simple**: Run `/smoke-test` first
2. **Test Incrementally**: One plugin at a time
3. **Use Test Data**: Generate realistic test contacts
4. **Check Logs**: Always review logs after tests
5. **Automate**: Create test scripts for CI/CD

## 🔗 Plugin Documentation

For detailed documentation on each plugin:
```bash
# In Claude Code:
/help api-test-automation
/help performance-test-suite
/help security-test-scanner
/help test-orchestrator
```

## ✅ Recommended Testing Order

1. **Smoke Test** (`/smoke-test`) - 1 minute
2. **API Test** (`/api-test`) - 5 minutes
3. **Security Scan** (`/security-scan`) - 10 minutes
4. **Database Test** (`/db-test`) - 5 minutes
5. **Performance Test** (`/performance-test`) - 15 minutes
6. **Integration Test** (`/orchestrate`) - 20 minutes

**Total: ~1 hour for comprehensive testing**

---

## 🎯 Next Steps

1. Start with smoke testing
2. Use `/api-test` for endpoint validation
3. Run `/security-scan` for vulnerabilities
4. Use `/performance-test` for benchmarking
5. Generate report with `/gen-report`

Ready to start testing! 🧪
