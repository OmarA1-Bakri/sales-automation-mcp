# Security Testing Quick Start Guide

## Prerequisites

1. Node.js 18+ installed
2. Dependencies installed: `cd mcp-server && npm install`
3. Environment variables configured (see `.env.example`)

---

## Running Security Tests

### Step 1: Start the API Server

Open a terminal window and start the server:

```bash
cd /home/omar/claude\ -\ sales_auto_skill/mcp-server
npm run api-server
```

Expected output:
```
🚀 Sales Automation API Server
================================
📡 HTTP: http://localhost:3000
📊 Dashboard: http://localhost:3000/dashboard
🔌 WebSocket: ws://localhost:3000
⚙️  YOLO Mode: DISABLED

Ready to automate sales! 🤖💼
```

Leave this terminal running.

---

### Step 2: Run CORS Security Test

Open a new terminal window:

```bash
cd /home/omar/claude\ -\ sales_auto_skill
node test-cors-security.js
```

**What it tests:**
- Valid origins are accepted (200/204/401)
- Invalid origins return 403 Forbidden (NOT 500)
- Malicious origins are blocked
- XSS injection attempts fail
- Server-to-server calls work (no origin header)

**Success criteria:**
- All tests pass
- No 500 errors
- Server remains stable

---

### Step 3: Run Security Headers Test

In the same terminal:

```bash
node test-security-headers.js
```

**What it tests:**
- Content-Security-Policy present and configured
- Strict-Transport-Security (HSTS) enabled
- X-Frame-Options prevents clickjacking
- X-Content-Type-Options prevents MIME sniffing
- All Helmet.js headers properly configured

**Success criteria:**
- Security score >= 90%
- All critical headers present
- No warnings about missing headers

---

## Manual Testing with curl

### Test Invalid Origin (Should Return 403):

```bash
curl -H "Origin: http://evil.com" -v http://localhost:3000/health
```

Expected: `Access-Control-Allow-Origin` header NOT present (rejected by CORS)

### Test Valid Origin (Should Succeed):

```bash
curl -H "Origin: http://localhost:3456" -v http://localhost:3000/health
```

Expected: `Access-Control-Allow-Origin: http://localhost:3456` header present

### Test No Origin (Should Succeed):

```bash
curl -v http://localhost:3000/health
```

Expected: 200 OK response with health status

### Check Security Headers:

```bash
curl -I http://localhost:3000/health
```

Expected headers:
- `Content-Security-Policy: ...`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: ...` (if HTTPS enabled)

---

## Environment Configuration

### Development Mode (.env):

```bash
NODE_ENV=development
API_PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3456

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Optional: Enable HTTPS
ENABLE_HTTPS=false
```

### Production Mode (.env):

```bash
NODE_ENV=production
API_PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Stricter rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=50

# Enable HTTPS
ENABLE_HTTPS=true
HTTPS_PORT=3443
SSL_KEY_PATH=/path/to/private-key.pem
SSL_CERT_PATH=/path/to/certificate.pem
TLS_MIN_VERSION=TLSv1.2
TLS_MAX_VERSION=TLSv1.3
```

---

## Troubleshooting

### Server Won't Start

**Error:** `EADDRINUSE: address already in use`

**Solution:** Kill existing process on port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Tests Fail with Connection Refused

**Solution:** Make sure server is running first:
```bash
curl http://localhost:3000/health
```

If this fails, restart the server.

### CORS Tests Show 500 Errors

**Problem:** CORS vulnerability NOT fixed

**Solution:** Verify the fix was applied:
```bash
grep -A 10 "origin: (origin, callback)" /home/omar/claude\ -\ sales_auto_skill/mcp-server/src/api-server.js
```

Should see `try {` block and `callback(null, false)` instead of `callback(new Error(...))`

### Security Headers Missing

**Problem:** Helmet.js not configured

**Solution:** Verify Helmet is installed and imported:
```bash
cd mcp-server && npm list helmet
grep "import helmet" src/api-server.js
```

---

## Test Output Examples

### Successful CORS Test:

```
╔════════════════════════════════════════════════════════════╗
║       CORS Security Test Suite - Vulnerability Fix       ║
╚════════════════════════════════════════════════════════════╝

Testing API: http://localhost:3000
Test Cases: 6

[1/6] Valid localhost origin (development)... ✓ PASS
  └─ Status: 200 (expected: 200 or 204 or 401)

[2/6] Valid allowed origin... ✓ PASS
  └─ Status: 200 (expected: 200 or 204 or 401)

[3/6] Invalid malicious origin... ✓ PASS
  └─ Status: 403 (expected: 403)

[4/6] Invalid XSS attempt... ✓ PASS
  └─ Status: 403 (expected: 403)

[5/6] No origin header (server-to-server)... ✓ PASS
  └─ Status: 200 (expected: 200 or 204 or 401)

[6/6] Invalid protocol... ✓ PASS
  └─ Status: 403 (expected: 403)

════════════════════════════════════════════════════════════
                        SUMMARY
════════════════════════════════════════════════════════════

Total Tests:  6
Passed:       6
Failed:       0

╔════════════════════════════════════════════════════════════╗
║   ✓ ALL TESTS PASSED - CORS VULNERABILITY FIXED!        ║
╚════════════════════════════════════════════════════════════╝

✓ Invalid origins return 403 Forbidden (not 500 error)
✓ Valid origins are accepted correctly
✓ Server does not crash on malicious origins
✓ CORS bypass vulnerability has been mitigated
```

### Successful Security Headers Test:

```
╔════════════════════════════════════════════════════════════╗
║          Security Headers Validation Test Suite          ║
╚════════════════════════════════════════════════════════════╝

Testing API: http://localhost:3000
Required Headers: 8
Optional Headers: 1

Response Status: 200

Security Headers Check:
────────────────────────────────────────────────────────────

✓ Content-Security-Policy
  Description: Prevents XSS attacks by restricting resource loading
  Status: All directives present: default-src 'self'; script-src 'self' 'unsafe-inline'...

✓ X-Frame-Options
  Description: Prevents clickjacking attacks
  Status: Correct value: DENY

✓ X-Content-Type-Options
  Description: Prevents MIME type sniffing
  Status: Correct value: nosniff

... (more headers)

════════════════════════════════════════════════════════════
                        SUMMARY
════════════════════════════════════════════════════════════

Total Headers Checked: 8
Passed:                8
Warnings:              0
Failed:                0

Security Score: 100%

╔════════════════════════════════════════════════════════════╗
║   ✓ ALL SECURITY HEADERS PROPERLY CONFIGURED!           ║
╚════════════════════════════════════════════════════════════╝

✓ Helmet.js is working correctly
✓ All critical security headers present
✓ Server is protected against common attacks
```

---

## Integration with CI/CD

### GitHub Actions Example:

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd mcp-server && npm install

      - name: Start API server
        run: cd mcp-server && npm run api-server &

      - name: Wait for server
        run: sleep 5

      - name: Run CORS security tests
        run: node test-cors-security.js

      - name: Run security headers tests
        run: node test-security-headers.js
```

---

## Monitoring in Production

### Log CORS Rejections:

```bash
# Monitor CORS errors in real-time
tail -f logs/api-server.log | grep "CORS.*Blocked"
```

### Alert on Attack Patterns:

Set up alerts for:
- High frequency of CORS rejections from same IP
- XSS injection attempts in Origin header
- Unusual patterns in rejected origins

---

## Next Steps

After confirming all tests pass:

1. Review `/home/omar/claude - sales_auto_skill/STAGE1_SECURITY_REPORT.md` for full details
2. Deploy to staging environment
3. Run tests against staging
4. Deploy to production with monitoring enabled
5. Prepare for Stage 2: Security Blitz (comprehensive audit)

---

## Support

For issues or questions:
- Review `STAGE1_SECURITY_REPORT.md` for detailed analysis
- Check server logs: `mcp-server/logs/api-server.log`
- Verify environment configuration in `.env`
- Ensure all dependencies are installed: `npm list`

**Security Contact:** security@yourdomain.com
**Documentation:** See `STAGE1_SECURITY_REPORT.md`
