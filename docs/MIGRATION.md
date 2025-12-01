# Migration Guide: MCP Server → Sales Automation API

**Migration Date:** November 22, 2024
**Version:** 1.0.0 → 2.0.0
**Reason:** Architectural clarity - renamed `mcp-server` to `sales-automation-api` to reflect actual usage

---

## 📋 What Changed?

### Directory Structure
```
OLD                                  NEW
mcp-server/                    →    sales-automation-api/
├── src/                            ├── src/
│   ├── server.js              →    │   ├── mcp-server.js    (MCP server preserved)
│   ├── api-server.js          →    │   ├── server.js         (Main HTTP REST API)
│   └── ...                         │   └── ...
└── package.json                    └── package.json
```

### Key File Renames

| Old Path | New Path | Purpose |
|----------|----------|---------|
| `mcp-server/` | `sales-automation-api/` | Directory renamed |
| `src/api-server.js` | `src/server.js` | Main HTTP API (now primary entry) |
| `src/server.js` | `src/mcp-server.js` | MCP server (preserved for future) |

### Package Configuration Changes

**`sales-automation-api/package.json`:**
```json
{
  "name": "sales-automation-api",          // was: sales-automation-mcp-server
  "main": "src/server.js",                 // was: src/server.js (but different file now)
  "scripts": {
    "start": "node src/server.js",         // was: npm run api-server
    "dev": "node --watch src/server.js",   // NEW
    "yolo": "node src/server.js --yolo",   // NEW
    "mcp": "node src/mcp-server.js",       // NEW - preserved MCP server
    "mcp:dev": "node --watch src/mcp-server.js"  // NEW
  }
}
```

### Updated Files

**Shell Scripts:**
- ✅ `scripts/rtgs-sales-automation.sh` - Main launcher
- ✅ `scripts/install.sh` - Installation script
- ✅ `scripts/start-postgres.sh` - PostgreSQL launcher

**Desktop App:**
- ✅ `desktop-app/electron/main.js` - Server path
- ✅ `desktop-app/src/pages/SettingsPage.jsx` - Help text

**Documentation:**
- ✅ `README.md` - All references
- ✅ `ARCHITECTURE.md` - NEW comprehensive architecture doc

---

## 🚀 Migration Steps

### For Local Development

**1. Pull Latest Changes**
```bash
git pull origin master
```

**2. Verify Directory Structure**
```bash
# Old directory should be gone, new one should exist
ls -la | grep -E "(mcp-server|sales-automation-api)"
# Should only show: sales-automation-api/
```

**3. Regenerate Dependencies**
```bash
cd sales-automation-api
rm -rf node_modules package-lock.json
npm install
cd ..
```

**4. Update Environment Variables (if needed)**
```bash
# .env file location unchanged (still at project root)
# No changes needed unless you had custom paths
```

**5. Test API Server**
```bash
cd sales-automation-api
npm start
# Should start on port 3456 (or configured port)
# Visit: http://localhost:3456/health
```

**6. Test Desktop App**
```bash
cd desktop-app
npm run dev
# Should launch Electron app
# Desktop app should connect to API server
```

**7. Test YOLO Mode (Optional)**
```bash
cd sales-automation-api
npm run yolo
# Should start with YOLO mode enabled
```

### For Production/Staging Deployment

**1. Backup Current Installation**
```bash
# Backup database
pg_dump rtgs_sales_automation > backup_$(date +%Y%m%d).sql

# Backup .env
cp .env .env.backup

# Backup logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
```

**2. Stop Running Services**
```bash
# Option 1: Using stop script
./scripts/stop.sh

# Option 2: Manual
pkill -f "mcp-server/src/api-server.js"  # Old path (if still running)
pkill -f "sales-automation-api/src/server.js"  # New path
pkill -f "vite"  # Desktop app
```

**3. Pull Latest Code**
```bash
git fetch origin
git checkout master
git pull origin master
```

**4. Verify File Structure**
```bash
# Verify old directory is gone
if [ -d "mcp-server" ]; then
    echo "WARNING: Old mcp-server directory still exists!"
    echo "Run: rm -rf mcp-server (after verifying git status)"
else
    echo "✓ Old directory removed"
fi

# Verify new directory exists
if [ -d "sales-automation-api" ]; then
    echo "✓ New directory exists"
else
    echo "ERROR: sales-automation-api directory missing!"
fi
```

**5. Reinstall Dependencies**
```bash
# Root workspace
npm install

# API Server
cd sales-automation-api
rm -rf node_modules package-lock.json
npm install
cd ..

# Desktop App
cd desktop-app
rm -rf node_modules package-lock.json
npm install
cd ..
```

**6. Run Database Migrations (if any)**
```bash
cd sales-automation-api
npm run db:migrate
cd ..
```

**7. Restart Services**
```bash
./scripts/rtgs-sales-automation.sh
```

**8. Verify Everything Works**
```bash
# Check API health
curl http://localhost:3456/health

# Check logs
tail -f logs/sales-automation-api.log
tail -f logs/desktop-app.log

# Access desktop app
open http://localhost:5173
```

---

## ✅ Verification Checklist

After migration, verify these items:

- [ ] **API Server Starts Successfully**
  ```bash
  cd sales-automation-api && npm start
  # Should see: "🚀 API Server running on port 3456"
  ```

- [ ] **Health Endpoint Responds**
  ```bash
  curl http://localhost:3456/health
  # Should return: {"status":"ok","timestamp":"..."}
  ```

- [ ] **Desktop App Launches**
  ```bash
  cd desktop-app && npm run dev
  # Electron window should open
  ```

- [ ] **Desktop App Connects to API**
  - Dashboard loads without errors
  - Settings page shows API connection status
  - Can toggle YOLO mode on/off

- [ ] **MCP Server Still Accessible (Optional)**
  ```bash
  cd sales-automation-api && npm run mcp
  # Should start MCP server (for future use)
  ```

- [ ] **Shell Scripts Work**
  ```bash
  ./scripts/rtgs-sales-automation.sh  # Should start both services
  ./scripts/stop.sh                    # Should stop both services
  ./scripts/start-postgres.sh          # Should start PostgreSQL
  ```

- [ ] **Logs Are Generated**
  ```bash
  ls -la logs/
  # Should see: sales-automation-api.log, desktop-app.log
  ```

- [ ] **Database Connections Work**
  - API can connect to PostgreSQL
  - Migrations table exists
  - Sample data loads

- [ ] **Integrations Work**
  - HubSpot sync (if configured)
  - Lemlist campaigns (if configured)
  - Explorium enrichment (if configured)
  - Claude AI chat (if configured)

- [ ] **YOLO Mode Works**
  ```bash
  cd sales-automation-api && npm run yolo
  # Should enable autonomous mode
  ```

---

## 🔄 Rollback Plan

If you encounter issues and need to rollback:

**1. Stop Services**
```bash
./scripts/stop.sh
```

**2. Checkout Previous Version**
```bash
git log --oneline  # Find commit before refactoring
git checkout <commit-hash>
```

**3. Restore Dependencies**
```bash
cd mcp-server
npm install
cd ../desktop-app
npm install
cd ..
```

**4. Restore Database (if needed)**
```bash
psql rtgs_sales_automation < backup_YYYYMMDD.sql
```

**5. Restart with Old Structure**
```bash
# Old launcher (if it exists)
./scripts/rtgs-sales-automation.sh

# Or manual start
cd mcp-server && npm run api-server &
cd desktop-app && npm run dev &
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'sales-automation-api'"

**Cause:** Desktop app trying to start API server from old path

**Fix:**
```bash
# Verify path in desktop-app/electron/main.js
grep -n "sales-automation-api" desktop-app/electron/main.js
# Should show line with correct path
```

### Issue: "npm run api-server: command not found"

**Cause:** Old npm script removed

**Fix:**
```bash
# Use new command
npm start  # Instead of npm run api-server
```

### Issue: PostgreSQL can't find init scripts

**Cause:** Docker volume mount pointing to old directory

**Fix:**
```bash
# Remove old container
docker rm -f rtgs-postgres

# Start with new script
./scripts/start-postgres.sh
```

### Issue: Logs not appearing

**Cause:** Log file paths changed

**Fix:**
```bash
# New log paths:
tail -f logs/sales-automation-api.log  # was: logs/mcp-server.log
tail -f logs/desktop-app.log           # unchanged
```

### Issue: Git shows untracked files

**Cause:** Used `mv` instead of `git mv` for renames

**Fix:**
```bash
# Git should auto-detect renames on commit
git status
# If it shows deleted + untracked instead of renamed:
git add -A
git commit -m "Refactor: Rename mcp-server to sales-automation-api

Directory renamed to reflect actual usage:
- 95% of code is HTTP REST API
- 5% is MCP server (preserved for future use)

Renamed files:
- mcp-server/ → sales-automation-api/
- src/api-server.js → src/server.js (main HTTP API)
- src/server.js → src/mcp-server.js (MCP server preserved)

Updated all references in:
- Shell scripts (rtgs-sales-automation.sh, install.sh, start-postgres.sh)
- Desktop app (main.js, SettingsPage.jsx)
- Documentation (README.md, ARCHITECTURE.md)
"
```

---

## 📚 Additional Resources

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive system architecture
- **[README.md](README.md)** - Quick start guide
- **[docs/user-guides/quickstart.md](docs/user-guides/quickstart.md)** - Detailed setup instructions
- **[docs/technical/architecture.md](docs/technical/architecture.md)** - Technical architecture details

---

## 🎯 Key Takeaways

1. **MCP Server Preserved:** The actual MCP server (`mcp-server.js`) is still available for future AI agent integration - it's just renamed, not removed.

2. **Main API Clarified:** The HTTP REST API (`server.js`) is now the obvious primary entry point.

3. **Zero Breaking Changes:** All functionality remains identical - this is purely a naming/organizational refactor.

4. **Better Documentation:** New `ARCHITECTURE.md` provides comprehensive system overview.

5. **Future-Proof:** Clear separation enables future MCP integration without confusion.

---

**Questions or Issues?**

Contact the RTGS development team or check the logs:
```bash
tail -f logs/sales-automation-api.log
tail -f logs/desktop-app.log
```
