# Node.js/Express.js Security Implementation Guide
## Comprehensive Best Practices for Production-Grade Security

**Stack:** Node.js 18+, Express.js 4.18, Sequelize ORM, SQLite3/PostgreSQL
**Compliance:** OWASP Top 10 2024-2025, NIST Guidelines
**Last Updated:** January 2025

---

## Table of Contents
1. [SQL Injection Prevention (Sequelize/PostgreSQL)](#1-sql-injection-prevention)
2. [File Permissions Hardening](#2-file-permissions-hardening)
3. [HTTPS/TLS Configuration](#3-httpstls-configuration)
4. [API Key Rotation Mechanism](#4-api-key-rotation-mechanism)

---

## 1. SQL Injection Prevention

### Industry Best Practices

1. **Always Use Parameterized Queries** (OWASP #1 Defense)
   - Sequelize model methods automatically parameterize queries
   - For raw queries, always use `replacements` or `bind` parameters
   - **Never concatenate user input into SQL strings**
   - Source: [OWASP Injection Prevention](https://owasp.org/Top10/A03_2021-Injection/)

2. **Use Bind Parameters for PostgreSQL** (Security + Performance)
   - Bind parameters (`$1, $2`) are sent separately from query text
   - Only SQLite and PostgreSQL support bind parameters
   - Replacements are escaped by Sequelize; bind params by database
   - Source: [Sequelize Raw Queries Documentation](https://sequelize.org/docs/v7/querying/raw-queries/)

3. **Keep Sequelize Updated** (Critical Security Patches)
   - Sequelize had SQL injection vulnerabilities in versions < 5.8.11 (MySQL) and < 3.35.1 (PostgreSQL)
   - Run `npm audit` regularly to identify vulnerabilities
   - Update ORM dependencies monthly minimum
   - Source: [Snyk Sequelize Advisory](https://snyk.io/blog/sequelize-orm-npm-library-found-vulnerable-to-sql-injection-attacks/)

4. **Validate Dynamic Column Names with Allow-Lists** (ORDER BY, SELECT)
   - **Cannot parameterize identifiers** (table names, column names)
   - Use `Model.getAttributes()` to get allowed column names
   - Whitelist valid columns before query execution
   - Source: [Optional SQL Injection Research](https://occamsec.com/optional-sql-injection/)

5. **Never Mix Replacements and WHERE Options** (Sequelize < 6.19.2)
   - CVE: SQL injection via replacements parameter
   - Upgrade to Sequelize >= 6.19.2 or avoid mixing
   - Source: [GitHub Advisory GHSA-wrh9-cjv3-2hpw](https://github.com/sequelize/sequelize/security/advisories/GHSA-wrh9-cjv3-2hpw)

6. **Add Multi-Layer Input Validation** (Defense in Depth)
   - Validate data types before database operations
   - Sanitize special characters in search terms
   - Use libraries like `validator.js` or `joi`
   - ORM protection alone is insufficient

7. **Use Database Constraints** (Last Line of Defense)
   - Implement UNIQUE, NOT NULL, CHECK constraints
   - Set proper column data types
   - Enforce foreign key constraints

### Common Vulnerabilities

1. **String Concatenation in Raw Queries**
   ```javascript
   // DANGEROUS - Direct injection vulnerability
   const userId = req.query.id;
   sequelize.query(`SELECT * FROM users WHERE id = ${userId}`);
   ```

2. **Dynamic ORDER BY Clauses**
   ```javascript
   // DANGEROUS - Cannot parameterize ORDER BY
   const sortBy = req.query.sort; // Could be "id; DROP TABLE users--"
   sequelize.query(`SELECT * FROM products ORDER BY ${sortBy}`);
   ```

3. **LIKE Clause Wildcards Without Escaping**
   ```javascript
   // VULNERABLE - Missing wildcard escaping
   const searchTerm = req.query.q; // Could contain SQL patterns
   sequelize.query(`SELECT * FROM items WHERE name LIKE '%${searchTerm}%'`);
   ```

4. **Using Sequelize.col() with User Input**
   ```javascript
   // RISKY - col() removes quotes but doesn't escape them
   const column = req.query.column;
   Model.findAll({ attributes: [sequelize.col(column)] });
   ```

5. **JSON Query Parameters**
   ```javascript
   // DANGEROUS - Complex object injection
   const filters = JSON.parse(req.body.filters);
   Model.findAll({ where: filters }); // Unvalidated complex queries
   ```

### Implementation Patterns

#### GOOD: Sequelize Model Methods (Automatic Parameterization)

```javascript
// Best practice: Use model methods with objects
const User = require('./models/user');

// Safe - automatically parameterized
app.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.json(user);
});

// Safe - where clause parameterized
app.get('/users', async (req, res) => {
  const users = await User.findAll({
    where: {
      email: req.query.email,
      status: 'active'
    }
  });
  res.json(users);
});
```

#### GOOD: Raw Queries with Named Replacements

```javascript
const { QueryTypes } = require('sequelize');

// Safe - named parameters
app.get('/search', async (req, res) => {
  const results = await sequelize.query(
    'SELECT * FROM users WHERE name = :name AND age > :minAge',
    {
      replacements: {
        name: req.query.name,
        minAge: req.query.minAge
      },
      type: QueryTypes.SELECT
    }
  );
  res.json(results);
});
```

#### GOOD: PostgreSQL Bind Parameters (Best Performance)

```javascript
// Safe - numeric bind parameters (PostgreSQL/SQLite only)
app.post('/orders', async (req, res) => {
  const result = await sequelize.query(
    'INSERT INTO orders (user_id, product_id, quantity) VALUES ($1, $2, $3)',
    {
      bind: [req.body.userId, req.body.productId, req.body.quantity],
      type: QueryTypes.INSERT
    }
  );
  res.json(result);
});

// Safe - named bind parameters
app.get('/reports', async (req, res) => {
  const results = await sequelize.query(
    'SELECT * FROM orders WHERE status = $status AND created_at > $date',
    {
      bind: {
        status: req.query.status,
        date: req.query.startDate
      },
      type: QueryTypes.SELECT
    }
  );
  res.json(results);
});
```

#### GOOD: Dynamic ORDER BY with Allow-List Validation

```javascript
// Safe - whitelist approach for dynamic sorting
app.get('/products', async (req, res) => {
  const { sortBy, order } = req.query;

  // Get valid column names from model
  const validColumns = Object.keys(Product.getAttributes());
  const validOrders = ['ASC', 'DESC'];

  // Validate against allow-list
  if (!validColumns.includes(sortBy) || !validOrders.includes(order.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid sort parameters' });
  }

  // Safe to use validated identifiers
  const products = await Product.findAll({
    order: [[sortBy, order]]
  });

  res.json(products);
});
```

#### GOOD: LIKE Queries with Proper Escaping

```javascript
const { Op } = require('sequelize');

// Safe - Sequelize operator with parameterization
app.get('/search', async (req, res) => {
  const searchTerm = req.query.q;

  // Input validation
  if (!searchTerm || searchTerm.length < 2) {
    return res.status(400).json({ error: 'Search term too short' });
  }

  // Safe - Op.like with replacement
  const results = await Product.findAll({
    where: {
      name: {
        [Op.like]: `%${searchTerm}%`
      }
    }
  });

  res.json(results);
});
```

#### BAD: All Dangerous Patterns to Avoid

```javascript
// NEVER DO THIS - Direct concatenation
const userId = req.params.id;
sequelize.query(`DELETE FROM users WHERE id = ${userId}`);

// NEVER DO THIS - Template literals with user input
const email = req.body.email;
sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);

// NEVER DO THIS - Dynamic table/column names without validation
const tableName = req.query.table;
sequelize.query(`SELECT * FROM ${tableName}`);

// NEVER DO THIS - JSON.stringify in queries
const filters = req.body.filters;
sequelize.query(`SELECT * FROM products WHERE filters = '${JSON.stringify(filters)}'`);

// NEVER DO THIS - Unvalidated ORDER BY
const sortColumn = req.query.sort;
Model.findAll({ order: [[sequelize.literal(sortColumn), 'ASC']] });
```

#### GOOD: pg (node-postgres) Direct Usage

```javascript
const { Pool } = require('pg');
const pool = new Pool();

// Safe - positional parameters
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1 AND password = $2',
    [username, password]
  );

  res.json(result.rows);
});

// Safe - named prepared statement for reuse
const preparedQuery = {
  name: 'fetch-user',
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId]
};

const result = await pool.query(preparedQuery);
```

### Testing/Validation

#### 1. Automated Testing with sqlmap

```bash
# Test a GET endpoint for SQL injection
sqlmap -u "http://localhost:3000/api/users?id=1" --batch --risk=3 --level=5

# Test POST endpoint with JSON payload
sqlmap -u "http://localhost:3000/api/search" \
  --data='{"query":"test"}' \
  --headers="Content-Type: application/json" \
  --batch

# Test with authentication
sqlmap -u "http://localhost:3000/api/products?sort=name" \
  --cookie="session=abc123" \
  --batch --tamper=space2comment
```

#### 2. Manual Testing Payloads

```javascript
// Test inputs to verify protection
const testPayloads = [
  "1' OR '1'='1",
  "1; DROP TABLE users--",
  "1' UNION SELECT NULL, username, password FROM users--",
  "1' AND SLEEP(5)--",
  "'; EXEC xp_cmdshell('dir'); --"
];

// Your application should reject or safely handle all of these
```

#### 3. Unit Tests for Validation Logic

```javascript
const request = require('supertest');
const app = require('../app');

describe('SQL Injection Protection', () => {
  test('should reject SQL injection in user ID', async () => {
    const response = await request(app)
      .get('/api/users?id=1\' OR \'1\'=\'1')
      .expect(400);

    expect(response.body.error).toMatch(/invalid/i);
  });

  test('should reject invalid ORDER BY column', async () => {
    const response = await request(app)
      .get('/api/products?sort=id;DROP TABLE products')
      .expect(400);

    expect(response.body.error).toMatch(/invalid sort/i);
  });
});
```

#### 4. Static Code Analysis

```bash
# Install security linting tools
npm install --save-dev eslint-plugin-security

# Add to .eslintrc.json
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}

# Run security scan
npx eslint . --ext .js

# Use Snyk for dependency scanning
npm install -g snyk
snyk test
snyk monitor
```

### Production Checklist

- [ ] All database queries use parameterized queries or ORM methods
- [ ] No string concatenation or template literals with user input in SQL
- [ ] Dynamic column names validated against allow-list before use
- [ ] Sequelize updated to latest stable version (>= 6.35.0)
- [ ] Input validation implemented before all database operations
- [ ] Database constraints (types, foreign keys, checks) enforced
- [ ] SQL injection testing performed with sqlmap
- [ ] Code reviewed for direct SQL construction patterns
- [ ] Error messages don't reveal database schema information
- [ ] Database user has minimum required privileges (not root/admin)
- [ ] Logging captures suspicious query patterns
- [ ] `npm audit` passes with no high/critical vulnerabilities

### References

- **OWASP SQL Injection Prevention**: https://owasp.org/www-community/attacks/SQL_Injection
- **OWASP Testing Guide - SQL Injection**: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection
- **Sequelize Raw Queries Documentation**: https://sequelize.org/docs/v7/querying/raw-queries/
- **Node-postgres Security**: https://node-postgres.com/features/queries
- **Snyk Sequelize Vulnerabilities**: https://snyk.io/blog/sequelize-orm-npm-library-found-vulnerable-to-sql-injection-attacks/
- **GitHub Sequelize Advisory GHSA-wrh9-cjv3-2hpw**: https://github.com/sequelize/sequelize/security/advisories/GHSA-wrh9-cjv3-2hpw
- **sqlmap Documentation**: https://github.com/sqlmapproject/sqlmap/wiki

---

## 2. File Permissions Hardening

### Industry Best Practices

1. **Secrets Files Must Be chmod 600** (Owner-Only Access)
   - `.env` files: `chmod 600 .env`
   - Private keys: `chmod 600 *.key`
   - Certificate files: `chmod 600 *.pem`
   - Database credentials: `chmod 600 config/*.json`
   - Reason: Prevents other users/processes from reading secrets
   - Source: [Let's Encrypt Community](https://community.letsencrypt.org/t/privkey1-pem-has-644-better-is-600/4057)

2. **Application Code Should Be chmod 644** (Read-Only for Others)
   - JavaScript files: `chmod 644 *.js`
   - Configuration templates: `chmod 644 config/*.example`
   - Public assets: `chmod 644 public/*`
   - Reason: Prevents unauthorized modification while allowing reads

3. **Executable Scripts Should Be chmod 750** (Owner + Group Execute)
   - Startup scripts: `chmod 750 bin/start.sh`
   - Migration scripts: `chmod 750 scripts/*.sh`
   - Deployment hooks: `chmod 750 hooks/*.sh`
   - Reason: Only owner and group can execute, others have no access

4. **Log Directories Should Be chmod 700** (Owner-Only Directory)
   - `chmod 700 logs/`
   - `chmod 600 logs/*.log`
   - Reason: Logs may contain sensitive information (IPs, user actions)

5. **Use Dedicated Service User** (Principle of Least Privilege)
   - Never run Node.js as root in production
   - Create dedicated user: `useradd -r -s /bin/false nodeapp`
   - Change ownership: `chown -R nodeapp:nodeapp /opt/app`
   - Source: [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

6. **Git Repository Security** (Prevent Secret Commits)
   - Add `.env` to `.gitignore` immediately
   - Never commit secrets to git history
   - Use pre-commit hooks to scan for secrets
   - Provide `.env.example` with dummy values

7. **Docker Secrets in Production** (Container Security)
   - Use Docker secrets instead of environment variables
   - Mount secrets at `/run/secrets/` with mode 0400
   - Read secrets from filesystem, not process.env
   - Source: [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)

### Common Vulnerabilities

1. **World-Readable Secrets Files (chmod 644)**
   - Any user on system can read `.env` file
   - Database credentials exposed to other processes
   - API keys accessible to malicious scripts

2. **Secrets Committed to Git History**
   - Old commits contain exposed credentials
   - Public repositories leak API keys
   - Fork network spreads secrets uncontrollably

3. **Running Node.js as Root**
   - Compromised app has full system access
   - File permission bypasses don't protect
   - Privilege escalation becomes trivial

4. **Environment Variables in Process List**
   - `ps aux | grep node` reveals secrets
   - Other users can inspect process environment
   - Docker `ENV` persists in image layers

5. **Overly Permissive Upload Directories**
   - `chmod 777 uploads/` allows code execution
   - Uploaded files become executable
   - PHP/scripts run with app privileges

### Implementation Patterns

#### GOOD: Secrets File Setup

```bash
# Create .env file with proper permissions
touch .env
chmod 600 .env

# Verify permissions
ls -la .env
# Output: -rw------- 1 nodeapp nodeapp 256 Jan 15 10:00 .env

# Set ownership
chown nodeapp:nodeapp .env

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore
```

#### GOOD: Application Directory Structure

```bash
# Set up proper permissions for production
cd /opt/myapp

# Application code - readable by all
find . -type f -name "*.js" -exec chmod 644 {} \;

# Directories - executable for traversal
find . -type d -exec chmod 755 {} \;

# Secrets - owner only
chmod 600 .env
chmod 600 config/database.json

# Private keys - owner only
chmod 600 certs/*.key
chmod 600 certs/*.pem

# Logs directory - owner only
chmod 700 logs/
chmod 600 logs/*.log

# Scripts - owner + group execute
chmod 750 bin/*.sh
chmod 750 scripts/*.sh

# Set ownership recursively
chown -R nodeapp:nodeapp /opt/myapp
```

#### GOOD: Service User Setup (systemd)

```bash
# Create dedicated user for Node.js app
sudo useradd -r -s /bin/false nodeapp

# Create application directory
sudo mkdir -p /opt/myapp
sudo chown nodeapp:nodeapp /opt/myapp

# Create systemd service file
sudo cat > /etc/systemd/system/myapp.service <<EOF
[Unit]
Description=My Node.js Application
After=network.target

[Service]
Type=simple
User=nodeapp
Group=nodeapp
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/myapp/logs

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
```

#### GOOD: .gitignore Configuration

```
# .gitignore - Comprehensive secrets protection

# Environment variables
.env
.env.*
!.env.example

# Secrets and credentials
config/secrets.json
config/database.json
credentials.json
service-account-key.json

# Private keys and certificates
*.key
*.pem
*.p12
*.pfx
certs/
ssl/

# Logs (may contain sensitive data)
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Dependencies
node_modules/
```

#### GOOD: Reading Docker Secrets in Node.js

```javascript
const fs = require('fs');
const path = require('path');

/**
 * Load secret from Docker secret or environment variable
 * Docker secrets are mounted at /run/secrets/<secret_name>
 */
function loadSecret(secretName, defaultValue = null) {
  const secretPath = path.join('/run/secrets', secretName);

  // Try Docker secret first (production)
  if (fs.existsSync(secretPath)) {
    try {
      // Docker secrets have trailing newline
      return fs.readFileSync(secretPath, 'utf8').trim();
    } catch (error) {
      console.error(`Failed to read Docker secret ${secretName}:`, error);
    }
  }

  // Fall back to environment variable (development)
  const envValue = process.env[secretName.toUpperCase()];
  if (envValue) {
    return envValue;
  }

  // Use default if provided
  if (defaultValue !== null) {
    return defaultValue;
  }

  throw new Error(`Secret ${secretName} not found in Docker secrets or environment`);
}

// Usage
const dbPassword = loadSecret('db_password');
const apiKey = loadSecret('api_key');
const jwtSecret = loadSecret('jwt_secret');

module.exports = { loadSecret };
```

#### GOOD: Docker Compose with Secrets

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    secrets:
      - db_password
      - api_key
      - jwt_secret
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_NAME: myapp
    user: "1000:1000"  # Run as non-root user

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

```bash
# Create secrets with proper permissions
mkdir -p secrets
echo "super_secure_password" > secrets/db_password.txt
chmod 600 secrets/db_password.txt

# Secrets directory should be secured
chmod 700 secrets/
```

#### GOOD: Pre-commit Hook for Secret Detection

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Install detect-secrets: pip install detect-secrets

echo "Running secret detection scan..."

# Scan staged files for secrets
git diff --cached --name-only | xargs detect-secrets-hook --baseline .secrets.baseline

if [ $? -ne 0 ]; then
  echo "❌ SECRET DETECTED! Commit blocked."
  echo "If this is a false positive, update .secrets.baseline"
  exit 1
fi

echo "✅ No secrets detected"
exit 0
```

```bash
# Install detect-secrets
pip install detect-secrets

# Create baseline (do this once)
detect-secrets scan > .secrets.baseline

# Make hook executable
chmod +x .git/hooks/pre-commit

# Alternative: Use git-secrets (AWS Labs)
git secrets --install
git secrets --register-aws
```

#### BAD: Insecure Patterns to Avoid

```bash
# NEVER DO THIS - World-readable secrets
chmod 644 .env  # Other users can read!

# NEVER DO THIS - Secrets in git
git add .env
git commit -m "Added configuration"  # DISASTER!

# NEVER DO THIS - Running as root
sudo node server.js  # Root privileges not needed!

# NEVER DO THIS - World-writable directories
chmod 777 uploads/  # Allows code execution!

# NEVER DO THIS - Hardcoded secrets in code
const apiKey = "sk-1234567890abcdef";  # Committed to git!
```

### Testing/Validation

#### 1. Audit Current File Permissions

```bash
# Check .env permissions
stat -c "%a %n" .env
# Expected: 600 .env

# Find world-readable files in project
find . -type f -perm -o=r -ls

# Find world-writable files (dangerous!)
find . -type f -perm -o=w -ls

# Check ownership
ls -la | grep -v "^d" | awk '{print $3, $4, $9}'
```

#### 2. Scan Git History for Secrets

```bash
# Install gitleaks
brew install gitleaks  # macOS
# or
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz

# Scan current repository
gitleaks detect --source . --verbose

# Scan entire git history
gitleaks detect --source . --log-opts="--all"

# Generate report
gitleaks detect --source . --report-path=gitleaks-report.json
```

#### 3. Verify Docker Secret Mounting

```bash
# Exec into running container
docker exec -it myapp_container /bin/sh

# Check secrets directory
ls -la /run/secrets/
# Expected: Only specified secrets with mode 400

# Verify secret content
cat /run/secrets/db_password

# Check process doesn't expose secrets
ps aux | grep node
# Should NOT show secret values in command line

# Exit container
exit
```

#### 4. Test Service User Permissions

```bash
# Switch to service user
sudo -u nodeapp -s

# Try to read secrets (should succeed)
cat /opt/myapp/.env

# Try to read other users' files (should fail)
cat /root/.bashrc

# Try to write to system directories (should fail)
touch /etc/test

# Exit service user
exit
```

### Production Checklist

- [ ] `.env` file has permissions 600 (owner read/write only)
- [ ] All private keys (.key, .pem) have permissions 600
- [ ] Application runs as dedicated non-root user
- [ ] Service user has minimal required permissions
- [ ] `.gitignore` includes all secrets patterns
- [ ] No secrets in git history (verified with gitleaks)
- [ ] Pre-commit hooks installed to prevent secret commits
- [ ] Docker secrets used instead of ENV variables (if using containers)
- [ ] Logs directory has restrictive permissions (700)
- [ ] Upload directories not world-writable (no 777)
- [ ] systemd service uses security hardening options
- [ ] Secrets rotated after any potential exposure
- [ ] `.env.example` provided for developers (no real secrets)

### References

- **OWASP Secrets Management**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
- **Docker Secrets Documentation**: https://docs.docker.com/engine/swarm/secrets/
- **gitleaks - Secret Scanning**: https://github.com/gitleaks/gitleaks
- **detect-secrets by Yelp**: https://github.com/Yelp/detect-secrets
- **git-secrets by AWS Labs**: https://github.com/awslabs/git-secrets
- **Linux File Permissions Guide**: https://www.redhat.com/sysadmin/linux-file-permissions-explained
- **GitGuardian Secret Detection**: https://www.gitguardian.com/

---

## 3. HTTPS/TLS Configuration

### Industry Best Practices

1. **Use Reverse Proxy for TLS Termination** (Production Standard)
   - nginx or Caddy handles HTTPS, proxies HTTP to Node.js
   - Better performance than Node.js native HTTPS
   - Easier certificate management and renewal
   - Recommended by Express.js official documentation
   - Source: [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

2. **Enforce TLS 1.2 and 1.3 Only** (Disable Legacy Protocols)
   - TLS 1.0 and 1.1 deprecated (RFC 8996)
   - SSLv2 and SSLv3 have critical vulnerabilities
   - TLS 1.3 provides best performance and security
   - Source: [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

3. **Use Modern Cipher Suites** (Strong Encryption)
   - Prioritize ECDHE for Perfect Forward Secrecy
   - Disable weak ciphers (RC4, 3DES, MD5)
   - TLS 1.3 cipher suite: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
   - Source: [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

4. **Let's Encrypt for Free Certificates** (Automated Renewal)
   - Free, trusted by all browsers
   - Automated renewal with Certbot
   - 90-day validity encourages automation
   - Wildcard certificates supported
   - Source: [Let's Encrypt](https://letsencrypt.org/)

5. **Implement HSTS Header** (Force HTTPS)
   - Strict-Transport-Security tells browsers to use HTTPS only
   - Minimum max-age: 31536000 (1 year)
   - Include subdomains and preload directives
   - Source: [OWASP HSTS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

6. **Automatic HTTP to HTTPS Redirect** (No Insecure Access)
   - All HTTP requests redirect to HTTPS
   - Use 301 (permanent) or 308 (preserve method) status codes
   - Redirect before processing any request data

7. **Certificate Management Best Practices**
   - Automate renewal (Certbot cron job)
   - Monitor expiration (30 days before)
   - Test renewal process regularly
   - Have rollback plan for certificate issues

### Common Vulnerabilities

1. **Mixed Content (HTTP Resources on HTTPS Pages)**
   - Browser blocks HTTP scripts/stylesheets on HTTPS pages
   - Degrades security and breaks functionality
   - Use CSP `upgrade-insecure-requests` directive

2. **Expired Certificates**
   - Let's Encrypt certs expire after 90 days
   - Manual renewal is error-prone
   - Causes complete service outage

3. **Weak TLS Configuration**
   - TLS 1.0/1.1 vulnerable to BEAST, POODLE attacks
   - Weak ciphers allow downgrade attacks
   - Missing Perfect Forward Secrecy

4. **Self-Signed Certificates in Production**
   - Browser warnings scare users away
   - No certificate revocation capability
   - Man-in-the-middle vulnerability

5. **Missing HSTS Header**
   - First request still vulnerable to MITM
   - Users can manually type http://
   - No browser-level protection

### Implementation Patterns

#### GOOD: nginx Reverse Proxy (Recommended Production Setup)

```nginx
# /etc/nginx/sites-available/myapp

# HTTP server - redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server - TLS termination
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    # SSL certificate files (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # TLS protocol versions - only modern
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cipher suites (Mozilla Modern configuration)
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # TLS 1.3 ciphersuites
    ssl_conf_command Ciphersuites TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256;

    # SSL optimization
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js app (HTTP on localhost)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Preserve original request info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file serving (optional)
    location /static {
        alias /opt/myapp/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site and test configuration
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### GOOD: Let's Encrypt Certificate Setup with Certbot

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (nginx plugin - automatic configuration)
sudo certbot --nginx -d example.com -d www.example.com

# Or manual certificate only (webroot method)
sudo certbot certonly --webroot -w /var/www/html -d example.com

# Test automatic renewal
sudo certbot renew --dry-run

# Certbot automatically creates cron job at:
# /etc/cron.d/certbot or systemd timer

# Check renewal timer (systemd)
sudo systemctl list-timers | grep certbot

# Manual renewal (if needed)
sudo certbot renew

# Reload nginx after renewal (hook)
sudo certbot renew --deploy-hook "systemctl reload nginx"
```

#### GOOD: Certbot with PM2 Reload Hook

```bash
# Create renewal hook script
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-app.sh

# Add PM2 reload command
#!/bin/bash
su - nodeapp -c 'cd /opt/myapp && pm2 reload app'

# Make executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-app.sh

# Test renewal with hooks
sudo certbot renew --dry-run
```

#### GOOD: Express.js with Trust Proxy (Behind nginx)

```javascript
// server.js
const express = require('express');
const helmet = require('helmet');
const app = express();

// Trust first proxy (nginx)
app.set('trust proxy', 1);

// Helmet security headers
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// Redirect HTTP to HTTPS (if Express handles both)
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }
  res.redirect(301, `https://${req.headers.host}${req.url}`);
});

// Your routes
app.get('/', (req, res) => {
  res.send('Secure HTTPS connection!');
});

// Listen on localhost only (nginx proxies to this)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
```

#### GOOD: Native Node.js HTTPS (Development Only)

```javascript
// https-server.js - For development testing only
const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

// Self-signed certificate (generate with mkcert)
const options = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost.pem'),

  // TLS configuration
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384'
  ].join(':'),
  honorCipherOrder: true
};

app.get('/', (req, res) => {
  res.send('HTTPS server running');
});

// Create HTTPS server
const server = https.createServer(options, app);

server.listen(3443, () => {
  console.log('HTTPS server running on https://localhost:3443');
});
```

```bash
# Generate development certificates with mkcert
# Install mkcert: https://github.com/FiloSottile/mkcert

# Install local CA
mkcert -install

# Generate certificate for localhost
mkdir certs
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

# Set permissions
chmod 600 certs/*.pem
```

#### GOOD: Caddy Server (Automatic HTTPS)

```caddyfile
# Caddyfile - Automatic HTTPS with Let's Encrypt

example.com www.example.com {
    # Caddy automatically obtains and renews certificates

    # Reverse proxy to Node.js
    reverse_proxy localhost:3000

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Start Caddy (automatically obtains certificate)
sudo systemctl enable caddy
sudo systemctl start caddy
```

#### BAD: Insecure Patterns to Avoid

```javascript
// NEVER IN PRODUCTION - Self-signed cert without proper CA
const options = {
  key: fs.readFileSync('self-signed-key.pem'),
  cert: fs.readFileSync('self-signed-cert.pem')
};
https.createServer(options, app).listen(443);

// NEVER DO THIS - Accepting all TLS versions
const options = {
  secureProtocol: 'SSLv23_method',  // Includes weak protocols!
};

// NEVER DO THIS - Allowing weak ciphers
const options = {
  ciphers: 'ALL',  // Includes vulnerable RC4, 3DES!
};

// NEVER DO THIS - Disabling certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';  // CRITICAL VULNERABILITY!

// NEVER DO THIS - No HTTPS redirect
app.listen(80, () => {
  console.log('HTTP only - no security!');
});
```

### Testing/Validation

#### 1. SSL Labs Server Test

```bash
# Test your server configuration
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=example.com

# Should achieve A+ rating with:
# - TLS 1.2 and 1.3 only
# - Strong cipher suites
# - HSTS enabled
# - Certificate chain valid
```

#### 2. Test TLS Configuration Locally

```bash
# Test TLS version support
openssl s_client -connect example.com:443 -tls1_2
openssl s_client -connect example.com:443 -tls1_3

# Test weak protocols are disabled (should fail)
openssl s_client -connect example.com:443 -tls1
openssl s_client -connect example.com:443 -ssl3

# Check certificate details
openssl s_client -connect example.com:443 -showcerts

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 example.com

# Test HSTS header
curl -I https://example.com | grep -i strict-transport

# Test HTTP to HTTPS redirect
curl -I http://example.com
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://example.com/
```

#### 3. Certificate Validation

```bash
# Check certificate expiration
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
openssl s_client -connect example.com:443 -CAfile /etc/ssl/certs/ca-certificates.crt

# Test OCSP stapling
openssl s_client -connect example.com:443 -status -tlsextdebug < /dev/null 2>&1 | grep "OCSP"
```

#### 4. Automated Security Scanning

```bash
# Install testssl.sh
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh

# Run comprehensive TLS test
./testssl.sh https://example.com

# Check specific vulnerabilities
./testssl.sh --vulnerable https://example.com

# Test HSTS
./testssl.sh --headers https://example.com
```

#### 5. Certificate Renewal Testing

```bash
# Test Let's Encrypt renewal (dry run)
sudo certbot renew --dry-run

# Check renewal timer status
sudo systemctl status certbot.timer

# View renewal configuration
sudo cat /etc/letsencrypt/renewal/example.com.conf

# Manually trigger renewal (for testing hooks)
sudo certbot renew --force-renewal
```

### Production Checklist

- [ ] Reverse proxy (nginx/Caddy) handles TLS termination
- [ ] TLS 1.2 minimum, TLS 1.3 preferred
- [ ] TLS 1.0, TLS 1.1, SSLv2, SSLv3 disabled
- [ ] Strong cipher suites configured (ECDHE preferred)
- [ ] Weak ciphers disabled (RC4, 3DES, MD5)
- [ ] Valid certificate from trusted CA (Let's Encrypt)
- [ ] Certificate chain complete and valid
- [ ] Automatic certificate renewal configured
- [ ] Renewal tested successfully (dry-run)
- [ ] Certificate expiration monitoring enabled
- [ ] HSTS header with 1-year max-age and preload
- [ ] HTTP to HTTPS redirect (301/308 status)
- [ ] OCSP stapling enabled
- [ ] SSL Labs test achieves A or A+ rating
- [ ] No mixed content warnings in browser console
- [ ] Security headers (X-Frame-Options, CSP) configured
- [ ] Nginx/app reloads automatically after cert renewal
- [ ] Logs capture TLS errors and certificate issues

### References

- **Express.js Security Best Practices**: https://expressjs.com/en/advanced/best-practice-security.html
- **Mozilla SSL Configuration Generator**: https://ssl-config.mozilla.org/
- **OWASP TLS Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html
- **Let's Encrypt Documentation**: https://letsencrypt.org/docs/
- **Certbot Documentation**: https://certbot.eff.org/docs/
- **SSL Labs Server Test**: https://www.ssllabs.com/ssltest/
- **testssl.sh**: https://github.com/drwetter/testssl.sh
- **OWASP HSTS Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html
- **RFC 8996 - TLS 1.0 and 1.1 Deprecation**: https://datatracker.ietf.org/doc/rfc8996/
- **mkcert - Local Development Certificates**: https://github.com/FiloSottile/mkcert

---

## 4. API Key Rotation Mechanism

### Industry Best Practices

1. **Grace Period with Dual-Key Support** (Zero-Downtime Rotation)
   - Allow old and new keys to be valid simultaneously
   - Typical grace period: 24-72 hours
   - System accepts both keys during transition
   - AWS Secrets Manager uses 24-hour overlap
   - Source: [API Key Rotation Best Practices - GitGuardian](https://blog.gitguardian.com/api-key-rotation-best-practices/)

2. **Time-Based Rotation Policy** (Regular Schedule)
   - Rotate every 30-90 days based on risk level
   - High-sensitivity: 30 days
   - Standard APIs: 60-90 days
   - Automated rotation preferred over manual
   - Source: [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

3. **Hash API Keys Before Storage** (Never Store Plain Text)
   - Use Argon2id for hashing (OWASP #1 recommendation)
   - Alternative: bcrypt with cost factor 12+
   - Store: `argon2id$v=19$m=19456,t=2,p=1$hash`
   - Compare using constant-time algorithm
   - Source: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

4. **Structured API Key Format** (Identifiable and Traceable)
   - Prefix identifies key type: `sk_live_`, `pk_test_`
   - Version component for rotation tracking
   - Random component: 32+ characters
   - Example: `sk_live_v2_4f3d8e9a7b6c1234567890abcdef`
   - Makes leaked keys identifiable
   - Source: [API Key Best Practices - Mergify](https://blog.mergify.com/api-keys-best-practice/)

5. **Comprehensive Audit Logging** (Track All Key Operations)
   - Log: creation, usage, rotation, revocation
   - Include: timestamp, IP, user agent, endpoint
   - Store logs for 90+ days (compliance)
   - Use structured logging (JSON) for analysis
   - Monitor for suspicious patterns
   - Source: [Node.js Logging Best Practices](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/)

6. **Immediate Revocation Capability** (Emergency Response)
   - Endpoint to invalidate keys instantly
   - No grace period for suspected compromise
   - Tombstone revoked keys (prevent reuse)
   - Notify users of emergency revocation

7. **Prefer Short-Lived Tokens Over Static Keys** (Modern Approach)
   - JWT tokens with 15-60 minute expiration
   - OAuth2 access tokens with refresh tokens
   - Reduces exposure window dramatically
   - Better for user-facing APIs
   - Source: [JWT vs API Keys - Scalekit](https://www.scalekit.com/blog/apikey-jwt-comparison)

### Common Vulnerabilities

1. **No Rotation Mechanism**
   - Keys valid indefinitely
   - Compromised keys undetectable
   - No way to enforce expiration

2. **Plain Text Key Storage**
   - Database breach exposes all keys
   - No protection if database leaked
   - API keys = passwords (must be hashed)

3. **Hard Cutover (No Grace Period)**
   - Old key immediately invalid after rotation
   - Causes service disruption
   - Forces manual intervention

4. **No Audit Trail**
   - Can't detect unauthorized access
   - No forensics after breach
   - Compliance violations (GDPR, SOC2)

5. **Weak Key Generation**
   - Predictable keys (sequential, timestamp-based)
   - Insufficient entropy (< 128 bits)
   - Vulnerable to brute force

### Implementation Patterns

#### GOOD: Database Schema for API Keys

```javascript
// models/apiKey.js
const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const argon2 = require('argon2');

module.exports = (sequelize) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Prefix for identification (stored plaintext for lookup)
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      // Example: sk_live_v2_a1b2c3d4
    },

    // Hashed key (never store plaintext)
    keyHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'key_hash'
    },

    // Key metadata
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Human-readable name for the key'
    },

    status: {
      type: DataTypes.ENUM('active', 'rotating', 'revoked', 'expired'),
      defaultValue: 'active',
      allowNull: false
    },

    // Rotation tracking
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
      comment: 'Automatic expiration date'
    },

    rotatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'rotated_at',
      comment: 'Last rotation timestamp'
    },

    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
      comment: 'Manual revocation timestamp'
    },

    // Grace period support
    gracePeriodEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'grace_period_ends_at',
      comment: 'Old key valid until this time'
    },

    // Ownership
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },

    // Usage tracking
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at'
    },

    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'usage_count'
    },

    // Security
    ipWhitelist: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'ip_whitelist',
      comment: 'Array of allowed IPs'
    },

    scopes: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
      comment: 'Permissions array: ["read:users", "write:products"]'
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['prefix'], unique: true },
      { fields: ['status'] },
      { fields: ['expires_at'] }
    ]
  });

  // Static method: Generate new API key
  ApiKey.generateKey = async function(userId, name, scopes = [], expiresInDays = 90) {
    // Generate cryptographically secure random key
    const randomBytes = crypto.randomBytes(32); // 256 bits
    const keySecret = randomBytes.toString('base64url'); // URL-safe base64

    // Generate prefix (identifies key type and version)
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    const prefix = `sk_live_v2_${timestamp}${random}`;

    // Complete key that user will receive (ONE TIME ONLY)
    const fullKey = `${prefix}.${keySecret}`;

    // Hash the secret portion (never store plaintext)
    const keyHash = await argon2.hash(keySecret, {
      type: argon2.argon2id,
      memoryCost: 19456,  // 19 MiB
      timeCost: 2,
      parallelism: 1
    });

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create database record
    const apiKey = await ApiKey.create({
      prefix,
      keyHash,
      name,
      userId,
      scopes,
      expiresAt,
      status: 'active',
      version: 1
    });

    // Return full key (show to user once)
    return {
      id: apiKey.id,
      key: fullKey,  // ONLY RETURNED ONCE!
      prefix: apiKey.prefix,
      expiresAt: apiKey.expiresAt,
      scopes: apiKey.scopes
    };
  };

  // Instance method: Verify key
  ApiKey.prototype.verifyKey = async function(providedKey) {
    // Extract secret portion (after prefix)
    const parts = providedKey.split('.');
    if (parts.length !== 2) return false;

    const [prefix, secret] = parts;

    // Prefix must match
    if (prefix !== this.prefix) return false;

    // Check status
    if (this.status === 'revoked') return false;

    // Check expiration
    if (this.expiresAt && this.expiresAt < new Date()) {
      await this.update({ status: 'expired' });
      return false;
    }

    // Verify hash (constant-time comparison)
    const isValid = await argon2.verify(this.keyHash, secret);

    if (isValid) {
      // Update usage tracking
      await this.update({
        lastUsedAt: new Date(),
        usageCount: this.usageCount + 1
      });
    }

    return isValid;
  };

  // Instance method: Rotate key
  ApiKey.prototype.rotate = async function(gracePeriodHours = 48) {
    // Generate new key
    const newKeyData = await ApiKey.generateKey(
      this.userId,
      this.name + ' (rotated)',
      this.scopes,
      90  // New expiration
    );

    // Mark current key as rotating with grace period
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);

    await this.update({
      status: 'rotating',
      gracePeriodEndsAt,
      rotatedAt: new Date()
    });

    return {
      oldKey: {
        prefix: this.prefix,
        validUntil: gracePeriodEndsAt
      },
      newKey: newKeyData
    };
  };

  // Instance method: Revoke immediately
  ApiKey.prototype.revoke = async function() {
    await this.update({
      status: 'revoked',
      revokedAt: new Date()
    });
  };

  return ApiKey;
};
```

#### GOOD: API Key Authentication Middleware

```javascript
// middleware/apiKeyAuth.js
const { ApiKey } = require('../models');
const { ApiKeyLog } = require('../models');
const rateLimit = require('express-rate-limit');

/**
 * Middleware to authenticate API key from Authorization header
 * Supports both active keys and keys in grace period
 */
async function authenticateApiKey(req, res, next) {
  try {
    // Extract API key from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid Authorization header',
        message: 'Format: Authorization: Bearer sk_live_v2_...'
      });
    }

    const providedKey = authHeader.substring(7); // Remove 'Bearer '

    // Extract prefix (before the dot)
    const prefix = providedKey.split('.')[0];

    if (!prefix) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    // Look up key by prefix (indexed, fast lookup)
    const apiKey = await ApiKey.findOne({
      where: { prefix },
      include: [{ model: User, attributes: ['id', 'email', 'status'] }]
    });

    if (!apiKey) {
      // Log failed attempt
      await logKeyUsage(null, req, false, 'Key not found');
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check user status
    if (apiKey.User.status !== 'active') {
      await logKeyUsage(apiKey.id, req, false, 'User account inactive');
      return res.status(403).json({ error: 'Account inactive' });
    }

    // Verify the key (hash comparison)
    const isValid = await apiKey.verifyKey(providedKey);

    if (!isValid) {
      // Check if this is an old key in grace period
      if (apiKey.status === 'rotating' && apiKey.gracePeriodEndsAt > new Date()) {
        // Allow usage but warn user
        res.setHeader('X-API-Key-Status', 'grace-period');
        res.setHeader('X-API-Key-Valid-Until', apiKey.gracePeriodEndsAt.toISOString());

        await logKeyUsage(apiKey.id, req, true, 'Grace period usage');
      } else {
        await logKeyUsage(apiKey.id, req, false, 'Invalid signature');
        return res.status(401).json({ error: 'Invalid API key' });
      }
    } else {
      await logKeyUsage(apiKey.id, req, true, 'Success');
    }

    // Check IP whitelist (if configured)
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;

      if (!apiKey.ipWhitelist.includes(clientIp)) {
        await logKeyUsage(apiKey.id, req, false, `IP not whitelisted: ${clientIp}`);
        return res.status(403).json({ error: 'IP address not authorized' });
      }
    }

    // Attach to request for use in routes
    req.apiKey = apiKey;
    req.userId = apiKey.userId;
    req.user = apiKey.User;
    req.scopes = apiKey.scopes;

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check required scopes
 */
function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    if (!req.scopes) {
      return res.status(403).json({ error: 'No scopes assigned to API key' });
    }

    const hasAllScopes = requiredScopes.every(scope =>
      req.scopes.includes(scope) || req.scopes.includes('admin:all')
    );

    if (!hasAllScopes) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredScopes,
        provided: req.scopes
      });
    }

    next();
  };
}

/**
 * Log API key usage
 */
async function logKeyUsage(apiKeyId, req, success, reason) {
  try {
    await ApiKeyLog.create({
      apiKeyId,
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      success,
      reason,
      requestId: req.id  // If using request ID middleware
    });
  } catch (error) {
    console.error('Failed to log API key usage:', error);
  }
}

// Rate limiting per API key
const apiKeyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each key to 1000 requests per window
  keyGenerator: (req) => req.apiKey?.prefix || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

module.exports = {
  authenticateApiKey,
  requireScopes,
  apiKeyRateLimiter
};
```

#### GOOD: API Key Management Routes

```javascript
// routes/apiKeys.js
const express = require('express');
const router = express.Router();
const { ApiKey } = require('../models');
const { authenticateUser } = require('../middleware/auth'); // User session auth

// List user's API keys
router.get('/api-keys', authenticateUser, async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'prefix', 'name', 'status', 'scopes', 'createdAt', 'expiresAt', 'lastUsedAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({ keys });
  } catch (error) {
    console.error('Failed to list API keys:', error);
    res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
});

// Create new API key
router.post('/api-keys', authenticateUser, async (req, res) => {
  try {
    const { name, scopes, expiresInDays } = req.body;

    // Validation
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Name must be at least 3 characters' });
    }

    // Check user's key limit
    const existingKeysCount = await ApiKey.count({
      where: {
        userId: req.user.id,
        status: ['active', 'rotating']
      }
    });

    if (existingKeysCount >= 10) {
      return res.status(400).json({
        error: 'Maximum API keys reached',
        message: 'You can have up to 10 active API keys. Revoke unused keys.'
      });
    }

    // Generate key
    const keyData = await ApiKey.generateKey(
      req.user.id,
      name,
      scopes || [],
      expiresInDays || 90
    );

    // Log key creation
    console.log(`API key created: ${keyData.prefix} for user ${req.user.id}`);

    res.status(201).json({
      message: 'API key created successfully',
      warning: 'Save this key securely. It will not be shown again!',
      key: keyData.key,  // ONLY TIME THIS IS SHOWN
      id: keyData.id,
      prefix: keyData.prefix,
      expiresAt: keyData.expiresAt
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Rotate API key (creates new key, starts grace period for old)
router.post('/api-keys/:id/rotate', authenticateUser, async (req, res) => {
  try {
    const { gracePeriodHours } = req.body;

    const apiKey = await ApiKey.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (apiKey.status !== 'active') {
      return res.status(400).json({ error: 'Can only rotate active keys' });
    }

    // Perform rotation
    const result = await apiKey.rotate(gracePeriodHours || 48);

    res.json({
      message: 'API key rotated successfully',
      oldKey: {
        prefix: result.oldKey.prefix,
        validUntil: result.oldKey.validUntil,
        message: 'Old key will remain valid during grace period'
      },
      newKey: {
        key: result.newKey.key,  // ONLY TIME THIS IS SHOWN
        prefix: result.newKey.prefix,
        warning: 'Update your applications with the new key before grace period ends'
      }
    });
  } catch (error) {
    console.error('Failed to rotate API key:', error);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

// Revoke API key immediately
router.delete('/api-keys/:id', authenticateUser, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await apiKey.revoke();

    res.json({
      message: 'API key revoked successfully',
      prefix: apiKey.prefix
    });
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Get API key usage statistics
router.get('/api-keys/:id/usage', authenticateUser, async (req, res) => {
  try {
    const { ApiKeyLog } = require('../models');

    const apiKey = await ApiKey.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Get usage logs (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await ApiKeyLog.findAll({
      where: {
        apiKeyId: apiKey.id,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: ['endpoint', 'method', 'success', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    // Aggregate statistics
    const stats = {
      totalRequests: apiKey.usageCount,
      lastUsed: apiKey.lastUsedAt,
      recentLogs: logs,
      successRate: logs.length > 0
        ? (logs.filter(l => l.success).length / logs.length * 100).toFixed(2) + '%'
        : 'N/A'
    };

    res.json(stats);
  } catch (error) {
    console.error('Failed to get API key usage:', error);
    res.status(500).json({ error: 'Failed to retrieve usage statistics' });
  }
});

module.exports = router;
```

#### GOOD: Protected API Route Example

```javascript
// routes/products.js
const express = require('express');
const router = express.Router();
const { authenticateApiKey, requireScopes, apiKeyRateLimiter } = require('../middleware/apiKeyAuth');
const { Product } = require('../models');

// Apply API key authentication and rate limiting to all routes
router.use(authenticateApiKey);
router.use(apiKeyRateLimiter);

// Public read access (requires 'read:products' scope)
router.get('/products', requireScopes('read:products'), async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json({ products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Write access (requires 'write:products' scope)
router.post('/products', requireScopes('write:products'), async (req, res) => {
  try {
    const { name, price, description } = req.body;

    const product = await Product.create({
      name,
      price,
      description,
      createdBy: req.userId  // Track who created it
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Admin access (requires 'admin:products' scope)
router.delete('/products/:id', requireScopes('admin:products'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
```

#### GOOD: Background Job to Clean Expired Keys

```javascript
// jobs/cleanupApiKeys.js
const { ApiKey } = require('../models');
const { Op } = require('sequelize');

/**
 * Background job to clean up expired and old rotating keys
 * Run this daily via cron or scheduler
 */
async function cleanupExpiredApiKeys() {
  try {
    const now = new Date();

    // 1. Mark expired keys
    const expiredCount = await ApiKey.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          expiresAt: { [Op.lt]: now }
        }
      }
    );

    console.log(`Marked ${expiredCount[0]} expired API keys`);

    // 2. Revoke keys past grace period
    const gracePeriodExpiredCount = await ApiKey.update(
      {
        status: 'revoked',
        revokedAt: now
      },
      {
        where: {
          status: 'rotating',
          gracePeriodEndsAt: { [Op.lt]: now }
        }
      }
    );

    console.log(`Auto-revoked ${gracePeriodExpiredCount[0]} keys past grace period`);

    // 3. Send notifications for keys expiring soon (7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSoon = await ApiKey.findAll({
      where: {
        status: 'active',
        expiresAt: {
          [Op.between]: [now, sevenDaysFromNow]
        }
      },
      include: ['User']
    });

    for (const key of expiringSoon) {
      // Send email notification
      console.log(`Notification: API key ${key.prefix} expiring soon for user ${key.User.email}`);
      // await sendExpirationWarningEmail(key.User.email, key);
    }

    console.log(`Sent ${expiringSoon.length} expiration warning notifications`);

  } catch (error) {
    console.error('Failed to clean up API keys:', error);
  }
}

// Run daily at 2 AM
if (require.main === module) {
  cleanupExpiredApiKeys()
    .then(() => {
      console.log('API key cleanup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('API key cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredApiKeys };
```

```bash
# Add to crontab
# crontab -e
0 2 * * * cd /opt/myapp && /usr/bin/node jobs/cleanupApiKeys.js >> logs/cleanup.log 2>&1
```

#### BAD: Insecure Patterns to Avoid

```javascript
// NEVER DO THIS - Store API keys in plain text
const apiKey = await ApiKey.create({
  key: 'sk_live_1234567890abcdef',  // VULNERABLE!
  userId: req.user.id
});

// NEVER DO THIS - Weak key generation
const apiKey = `api_${Date.now()}_${userId}`;  // Predictable!

// NEVER DO THIS - No rotation support
if (req.headers['api-key'] === user.apiKey) {
  // Single static key forever
}

// NEVER DO THIS - API key in URL
app.get('/api/data?api_key=sk_live_123', (req, res) => {
  // Logged in server access logs, browser history
});

// NEVER DO THIS - No audit logging
if (isValidKey) {
  return res.json({ data });  // No record of who accessed what
}
```

### Testing/Validation

#### 1. Test Key Generation and Hashing

```javascript
// test/apiKey.test.js
const { ApiKey } = require('../models');
const assert = require('assert');

describe('API Key Generation', () => {
  test('should generate cryptographically secure key', async () => {
    const keyData = await ApiKey.generateKey(userId, 'Test Key');

    // Key should have prefix and secret
    assert(keyData.key.includes('.'));
    const [prefix, secret] = keyData.key.split('.');

    // Prefix format
    assert(prefix.startsWith('sk_live_v2_'));

    // Secret should be 32+ characters
    assert(secret.length >= 32);

    // Key should not be stored in database
    const dbKey = await ApiKey.findByPk(keyData.id);
    assert(dbKey.keyHash !== secret);
    assert(!dbKey.key);
  });

  test('should verify valid key', async () => {
    const keyData = await ApiKey.generateKey(userId, 'Test Key');
    const apiKey = await ApiKey.findByPk(keyData.id);

    const isValid = await apiKey.verifyKey(keyData.key);
    assert(isValid === true);
  });

  test('should reject invalid key', async () => {
    const keyData = await ApiKey.generateKey(userId, 'Test Key');
    const apiKey = await ApiKey.findByPk(keyData.id);

    const isValid = await apiKey.verifyKey('sk_live_v2_invalid.wrongsecret');
    assert(isValid === false);
  });
});
```

#### 2. Test Key Rotation with Grace Period

```javascript
describe('API Key Rotation', () => {
  test('should create new key and set grace period', async () => {
    const keyData = await ApiKey.generateKey(userId, 'Test Key');
    const oldKey = await ApiKey.findByPk(keyData.id);

    const result = await oldKey.rotate(48); // 48 hour grace period

    // Old key should be in rotating status
    await oldKey.reload();
    assert(oldKey.status === 'rotating');
    assert(oldKey.gracePeriodEndsAt > new Date());

    // New key should be active
    const newKey = await ApiKey.findOne({ where: { prefix: result.newKey.prefix } });
    assert(newKey.status === 'active');
  });

  test('should accept both keys during grace period', async () => {
    const keyData = await ApiKey.generateKey(userId, 'Test Key');
    const oldKey = await ApiKey.findByPk(keyData.id);
    const oldKeyValue = keyData.key;

    const result = await oldKey.rotate(48);
    const newKeyValue = result.newKey.key;

    // Both should work
    const oldStillWorks = await oldKey.verifyKey(oldKeyValue);
    assert(oldStillWorks === true);

    const newKey = await ApiKey.findOne({ where: { prefix: result.newKey.prefix } });
    const newWorks = await newKey.verifyKey(newKeyValue);
    assert(newWorks === true);
  });
});
```

#### 3. Load Testing API Key Authentication

```bash
# Install Apache Bench or k6
npm install -g k6

# Create load test script
cat > load-test.js <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,  // 100 virtual users
  duration: '30s',
};

export default function () {
  const url = 'https://api.example.com/products';
  const params = {
    headers: {
      'Authorization': 'Bearer sk_live_v2_abc123...',
    },
  };

  let response = http.get(url, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

#### 4. Security Audit Checklist

```bash
# Check for plain text keys in database
psql -U postgres -d myapp -c "SELECT id, prefix FROM api_keys WHERE key_hash IS NULL OR key_hash = '';"

# Find keys without expiration
psql -U postgres -d myapp -c "SELECT id, prefix, created_at FROM api_keys WHERE expires_at IS NULL AND status = 'active';"

# Find old keys never used
psql -U postgres -d myapp -c "SELECT id, prefix, created_at FROM api_keys WHERE last_used_at IS NULL AND created_at < NOW() - INTERVAL '30 days';"

# Check for keys with excessive permissions
psql -U postgres -d myapp -c "SELECT id, prefix, scopes FROM api_keys WHERE scopes::jsonb @> '[\"admin:all\"]'::jsonb;"
```

### Production Checklist

- [ ] API keys hashed with Argon2id (never plain text)
- [ ] Key generation uses crypto.randomBytes (32+ bytes)
- [ ] Keys have structured format with identifiable prefix
- [ ] Rotation mechanism implemented with grace period
- [ ] Grace period duration: 24-72 hours
- [ ] Both old and new keys work during grace period
- [ ] Automatic expiration after 30-90 days
- [ ] Background job revokes expired keys daily
- [ ] Immediate revocation endpoint available
- [ ] Comprehensive audit logging (all key operations)
- [ ] Logs retained for 90+ days
- [ ] Rate limiting per API key enforced
- [ ] Scope-based permissions implemented
- [ ] IP whitelist option available
- [ ] User limit on active keys enforced (e.g., 10 max)
- [ ] Expiration warnings sent 7 days before
- [ ] Usage statistics available to users
- [ ] Keys only shown once at creation
- [ ] No keys in URL query parameters
- [ ] No keys logged in plain text

### References

- **OWASP Secrets Management Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **OWASP Password Storage Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **GitGuardian API Key Rotation Best Practices**: https://blog.gitguardian.com/api-key-rotation-best-practices/
- **API Key Best Practices - Mergify**: https://blog.mergify.com/api-keys-best-practice/
- **JWT vs API Keys - Scalekit**: https://www.scalekit.com/blog/apikey-jwt-comparison
- **Argon2 RFC 9106**: https://datatracker.ietf.org/doc/rfc9106/
- **Node.js Crypto Documentation**: https://nodejs.org/api/crypto.html
- **AWS Secrets Manager Rotation**: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html

---

## Summary of Critical Security Principles

### Defense in Depth
- Multiple layers of security (never rely on single protection)
- Combine parameterized queries with input validation
- Use hashing + encryption + access controls

### Principle of Least Privilege
- Database user: minimum required permissions
- Service user: no root access
- API keys: scope-limited permissions
- File permissions: owner-only for secrets

### Fail Securely
- Invalid API key → 401 (not 500 with stack trace)
- SQL error → generic message (not schema details)
- Certificate error → service unavailable (not bypass)

### Assume Breach
- Hash API keys (database breach doesn't expose them)
- Rotate credentials regularly (limit exposure window)
- Audit logging (detect and respond to incidents)
- Grace periods (allow rotation without downtime)

### Automation Over Manual Processes
- Certbot auto-renewal (not manual)
- Pre-commit hooks (catch secrets before push)
- Scheduled key rotation (not ad-hoc)
- Background jobs (clean up expired keys)

### Compliance Alignment
- **OWASP Top 10 2024**: Injection (#3), Cryptographic Failures (#2), Security Misconfiguration (#5)
- **NIST SP 800-63B**: Password storage (Argon2), authentication
- **GDPR**: Audit logging, data encryption, breach notification
- **SOC 2**: Access controls, encryption in transit, monitoring

---

## Quick Reference Commands

### SQL Injection Testing
```bash
sqlmap -u "http://localhost:3000/api/users?id=1" --batch
npm audit
npx eslint . --ext .js
```

### File Permissions
```bash
chmod 600 .env
chmod 600 certs/*.pem
chmod 700 logs/
chown -R nodeapp:nodeapp /opt/myapp
find . -type f -perm -o=r -ls
```

### HTTPS/TLS
```bash
sudo certbot --nginx -d example.com
sudo certbot renew --dry-run
openssl s_client -connect example.com:443 -tls1_3
./testssl.sh https://example.com
```

### API Key Management
```bash
# Generate key (via API)
curl -X POST https://api.example.com/api-keys \
  -H "Authorization: Bearer session_token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Key", "scopes": ["read:products"], "expiresInDays": 90}'

# Use key
curl https://api.example.com/products \
  -H "Authorization: Bearer sk_live_v2_abc123..."

# Rotate key
curl -X POST https://api.example.com/api-keys/{id}/rotate \
  -H "Authorization: Bearer session_token"
```

---

**Document Version:** 1.0
**Created:** January 2025
**Technology Stack:** Node.js 18+, Express.js 4.18, Sequelize 6.35+, PostgreSQL 14+
**Compliance Standards:** OWASP Top 10 2024-2025, NIST SP 800-63B, GDPR, SOC 2
