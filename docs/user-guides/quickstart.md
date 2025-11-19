# 🚀 RTGS Sales Automation - Quick Start Guide

Get up and running in under 5 minutes!

## One-Command Install

```bash
./install.sh
```

That's it! The installer will:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Install all dependencies (753 packages)
- ✅ Set up configuration
- ✅ Create launcher scripts
- ✅ Create desktop icon
- ✅ Generate app icon

## Launch the App

### Option 1: Desktop Icon (Easiest)
1. Search for "RTGS Sales Automation" in your app menu
2. Click to launch
3. Open browser to http://localhost:5173

### Option 2: Command Line
```bash
./rtgs-sales-automation.sh
```

### Option 3: Manual (Two Terminals)
```bash
# Terminal 1 - MCP Server
cd mcp-server
npm run api-server

# Terminal 2 - Desktop App
cd desktop-app
npm run dev
```

## Stop the App

### From Terminal
Press `Ctrl+C` in the terminal where you started the app

### Or Use Stop Script
```bash
./stop.sh
```

## First Run - Desktop App Walkthrough

### What You'll See

When you open http://localhost:5173, you'll see:

**Left Sidebar** (Icon-Based Navigation):
- 📊 Dashboard - Main view with metrics and YOLO controls
- 💬 AI Assistant - Chat with Claude for help
- 📧 Campaigns - Email campaign management
- 👥 Contacts - Contact database
- 📥 Import - CSV/Lemlist/HubSpot import
- 🎯 ICP Profiles - Ideal customer profiles
- ⚙️ Settings - API keys and configuration

**Top Title Bar**:
- Window controls (minimize, maximize, close)
- App title: "RTGS Sales Automation"

### 1. Configure API Keys (Settings View)

Click ⚙️ **Settings** in the sidebar:

1. **HubSpot Integration**:
   - Enter your Private App Access Token
   - Click "Test Connection"
   - Status should show "Connected"

2. **Lemlist Integration**:
   - Enter your API Key
   - Click "Test Connection"
   - Status should show "Connected"

3. **Explorium Enrichment** (optional):
   - Enter API Key if you have one
   - Test connection

4. **Claude AI Chat**:
   - Enter your Anthropic API Key
   - Enables the AI assistant
   - Click "Save All Settings"

### 2. Create Your First ICP Profile

Click 🎯 **ICP Profiles** in the sidebar:

1. Click "+ New Profile" button
2. Enter profile details:
   - **Name**: "My First ICP"
   - **Industries**: Add relevant industries (e.g., "Payment Service Provider")
   - **Company Size**: Set min/max employees (e.g., 100-2000)
   - **Target Titles**: Add primary titles (e.g., "Head of Treasury")
   - **Geography**: Select countries

3. Set scoring thresholds:
   - **Auto-Approve**: 0.75 (green zone)
   - **Review**: 0.60 (amber zone)
   - **Disqualify**: 0.45 (red zone)

4. Click "Save Profile"

### 3. Enable YOLO Mode (Dashboard)

Click 📊 **Dashboard** in the sidebar:

1. Locate the **YOLO Mode Control Panel**
2. Click the blue **"Enable YOLO"** button
3. Configure settings:
   - Schedule: "0 9 * * *" (daily at 9 AM)
   - Daily limits: 50 discoveries, 50 enrichments, 200 emails
   - Quality thresholds: Use defaults
4. Click "Start YOLO Mode"
5. Status indicator turns green 🟢

**That's it!** The system will now run autonomously.

## Daily Usage Workflows

### Workflow 1: Morning Check (Dashboard)

Click 📊 **Dashboard**:

1. **Check Key Metrics** (top cards):
   - Total Contacts
   - Active Campaigns
   - Reply Rate
   - YOLO Status

2. **Review Activity Feed**:
   - Recent discoveries
   - Enrichments completed
   - Contacts synced
   - Campaigns enrolled

3. **Monitor YOLO Mode**:
   - Status indicator: 🟢 Green = running
   - Quick actions: Pause, Resume, Stop

### Workflow 2: Import Contacts (Import View)

Click 📥 **Import**:

**Option A - CSV Upload**:
1. Click "CSV Upload" tab
2. Drag & drop your CSV file (or click to browse)
3. Map fields:
   - Email (required)
   - First Name, Last Name
   - Company, Title
4. Enable "Auto-enrich after import" (optional)
5. Click "Import Contacts"
6. Monitor progress bar

**Option B - Sync from Lemlist**:
1. Click "From Lemlist" tab
2. Select campaign
3. Click "Import Leads"
4. Review imported count

**Option C - Sync from HubSpot**:
1. Click "From HubSpot" tab
2. Select list or segment
3. Choose properties to import
4. Click "Sync Contacts"

### Workflow 3: Chat with AI Assistant

Click 💬 **AI Assistant**:

1. **Type Your Question**:
   ```
   Examples:
   - "How do I create a new campaign?"
   - "What's the best ICP score threshold?"
   - "How can I improve my email open rate?"
   - "Show me YOLO mode status"
   ```

2. **Send Message**:
   - Press Enter or click Send button
   - Rate limit: 10 messages/minute

3. **Review Response**:
   - Claude provides contextual help
   - Conversation history is saved
   - Scroll up to see previous messages

### Workflow 4: Review Campaign Performance (Campaigns View)

Click 📧 **Campaigns**:

1. **View Campaign List**:
   - See all active campaigns
   - Performance color coding:
     - 🟢 Green: Excellent (reply rate > 10%)
     - 🟡 Amber: Good (reply rate 5-10%)
     - 🔴 Red: Poor (reply rate < 5%)

2. **Click Campaign Name** for details:
   - Email breakdown by step
   - Open, click, reply rates per email
   - Recent activity

3. **Take Actions**:
   - Pause campaign
   - Resume campaign
   - Edit settings

### Workflow 5: Manage Contacts (Contacts View)

Click 👥 **Contacts**:

1. **Filter Contacts**:
   - By source (CSV, Lemlist, HubSpot)
   - By status (Imported, Enriched, Synced, Enrolled)
   - By ICP score (> 0.7 for high quality)
   - By data quality score

2. **Bulk Actions**:
   - Select contacts (checkboxes)
   - Click action button:
     - "Enrich Selected"
     - "Sync to HubSpot"
     - "Add to Campaign"
     - "Export CSV"

3. **View Contact Details**:
   - Click contact row
   - See full enrichment data
   - View associated company
   - Check sync status

## Troubleshooting

### App Won't Start

**Symptoms**: Browser shows "Connection refused" or blank page

**Solutions**:
```bash
# 1. Check if processes are running
ps aux | grep -E "api-server|vite"

# 2. Stop any running instances
./stop.sh

# 3. Reinstall dependencies
./install.sh

# 4. Start fresh
./rtgs-sales-automation.sh
```

### Port Already in Use

**Symptoms**: Error message "Port 3000 already in use" or "Port 5173 already in use"

**Solutions**:
```bash
# Stop all instances
./stop.sh

# Kill rogue processes
pkill -f api-server
pkill -f vite

# Check if ports are free
lsof -i :3000
lsof -i :5173

# Restart
./rtgs-sales-automation.sh
```

### Desktop UI Not Loading

**Symptoms**: Browser shows loading spinner indefinitely

**Solutions**:
1. Check API server is running:
   - Visit http://localhost:3000/health
   - Should return JSON: `{"status":"healthy"}`

2. Check browser console (F12):
   - Look for connection errors
   - Check for CORS issues

3. Clear browser cache:
   - Press Ctrl+Shift+R (hard refresh)
   - Or clear site data

4. Check logs:
   ```bash
   tail -f logs/desktop-app.log
   ```

### AI Chat Not Working

**Symptoms**: "Failed to send message" or 429 rate limit errors

**Solutions**:
1. **Check API Key** (Settings view):
   - Verify Anthropic API Key is entered
   - Click "Test Connection"

2. **Rate Limit** (10 msg/min):
   - Wait 1 minute between bursts
   - Notification shows "Rate limit exceeded"

3. **API Quota**:
   - Check Anthropic console for quota
   - May need to upgrade plan

### Import Fails

**Symptoms**: "Import failed" error in Import view

**Solutions**:
1. **CSV Format**:
   - Must be UTF-8 encoded
   - Header row required
   - Email column mandatory

2. **API Connection**:
   - Test HubSpot/Lemlist connection in Settings
   - Check API keys are valid

3. **File Size**:
   - Max 10MB per file
   - Max 10,000 rows
   - Split large files

### Enrichment Not Working

**Symptoms**: Contacts stuck in "Imported" status

**Solutions**:
1. **Check API Keys** (Settings):
   - Explorium API Key (if using)
   - HubSpot API Key

2. **Check Quotas**:
   - Explorium credits remaining
   - Rate limits not exceeded

3. **Check Logs**:
   ```bash
   tail -f logs/mcp-server.log | grep -i enrichment
   ```

### YOLO Mode Won't Start

**Symptoms**: Enable button doesn't work or YOLO stops immediately

**Solutions**:
1. **Check Prerequisites**:
   - At least 1 active ICP profile
   - API keys configured (Settings)
   - Schedule configured

2. **Check Job Queue**:
   - Dashboard shows job status
   - Look for error messages in activity feed

3. **Check Logs**:
   ```bash
   tail -f logs/mcp-server.log | grep -i yolo
   ```

4. **Reset YOLO State**:
   - Click "Disable YOLO"
   - Wait 10 seconds
   - Click "Enable YOLO" again

### View Logs

```bash
# API Server logs (backend)
tail -f logs/mcp-server.log

# Desktop App logs (frontend)
tail -f logs/desktop-app.log

# Filter for errors only
tail -f logs/mcp-server.log | grep -i error

# Filter for specific component
tail -f logs/mcp-server.log | grep -i enrichment
```

### Reset Database

**Warning**: This deletes all data!

```bash
# Stop the app first
./stop.sh

# Remove database files
rm -rf .sales-automation/*.db

# Restart (database will be recreated)
./rtgs-sales-automation.sh
```

### Clear Cache

```bash
# Stop the app
./stop.sh

# Clear enrichment cache (keeps contacts)
sqlite3 .sales-automation/sales-automation.db "DELETE FROM enrichment_cache;"

# Restart
./rtgs-sales-automation.sh
```

## File Structure

```
rtgs-sales-automation/
├── install.sh                      # 📦 One-command installer
├── rtgs-sales-automation.sh        # 🚀 App launcher
├── stop.sh                         # 🛑 Stop script
├── test-local.sh                   # 🧪 Test script
│
├── mcp-server/                     # Backend API server
│   ├── src/
│   │   ├── server.js              # MCP server
│   │   ├── api-server.js          # REST API
│   │   ├── workers/               # Workers
│   │   ├── clients/               # API clients
│   │   └── utils/                 # Utilities
│   └── package.json
│
├── desktop-app/                    # Frontend UI
│   ├── src/
│   │   ├── App.jsx                # Main app
│   │   ├── pages/                 # Views
│   │   ├── components/            # UI components
│   │   ├── services/              # API layer
│   │   └── store/                 # State management
│   └── package.json
│
├── .env                            # API keys (gitignored)
├── .sales-automation/              # Data directory
└── logs/                           # Log files
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `./install.sh` | Install everything |
| `./rtgs-sales-automation.sh` | Start the app |
| `./stop.sh` | Stop the app |
| `./test-local.sh` | Run tests |
| `tail -f logs/mcp-server.log` | View MCP logs |
| `tail -f logs/desktop-app.log` | View app logs |

## Access Points

- 🌐 **Desktop App UI**: http://localhost:5173
- 🔌 **MCP Server API**: http://localhost:3456
- 📊 **API Health Check**: http://localhost:3456/health

## Keyboard Shortcuts

**Navigation**:
- `Ctrl+1` - Dashboard
- `Ctrl+2` - AI Assistant
- `Ctrl+3` - Campaigns
- `Ctrl+4` - Contacts
- `Ctrl+5` - Import
- `Ctrl+6` - ICP Profiles
- `Ctrl+7` - Settings

**AI Chat**:
- `Enter` - Send message
- `Shift+Enter` - New line (without sending)
- `Ctrl+K` - Clear conversation
- `Esc` - Close chat

**Contacts View**:
- `Ctrl+A` - Select all
- `Ctrl+D` - Deselect all
- `Ctrl+E` - Enrich selected
- `Ctrl+S` - Sync to HubSpot
- `Delete` - Delete selected

**General**:
- `Ctrl+R` - Refresh current view
- `F5` - Reload app
- `Ctrl+Shift+R` - Hard refresh (clear cache)
- `F12` - Open browser dev tools

## Need Help?

### In-App Help
1. **Ask AI Assistant** (💬):
   - Click AI Assistant in sidebar
   - Type your question
   - Get instant help

2. **Hover Tooltips**:
   - Hover over any icon or button
   - See helpful descriptions

### Documentation

**User Guides**:
- [Desktop App Guide](desktop-app.md) - Complete UI walkthrough
- [YOLO Mode Guide](yolo-mode.md) - Autonomous operation
- [RTGS Quickstart](rtgs-quickstart.md) - RTGS-specific workflows

**Technical Docs**:
- [Architecture](../technical/architecture.md) - System design
- [Integrations](../technical/integrations.md) - API details
- [Claude Instructions](../technical/claude-instructions.md) - AI agent docs

**Development**:
- [Setup Guide](../development/setup.md) - Development environment
- [Contributing](../development/contributing.md) - How to contribute
- [Testing](../development/testing.md) - Test strategy

### Troubleshooting

1. **Check logs**: `tail -f logs/*.log`
2. **Run tests**: `./test-local.sh`
3. **Reinstall**: `./install.sh`
4. **Reset database**: See [Troubleshooting](#troubleshooting) above

## What You Can Do

### ✅ All Features Available (v1.0.0)

**Dashboard**:
- View real-time metrics (contacts, campaigns, reply rate)
- Control YOLO mode (enable, pause, resume, stop)
- Monitor recent activity feed
- Quick actions for common tasks

**AI Assistant**:
- Chat with Claude Haiku 4-5 for instant help
- Get contextual guidance on any feature
- Natural language questions and answers
- Conversation history saved

**Campaigns**:
- View all active email campaigns
- Monitor performance (open, click, reply rates)
- See email breakdown by sequence step
- Pause/resume campaigns
- Performance color coding

**Contacts**:
- Import from CSV, Lemlist, HubSpot
- Advanced filtering by status, score, source
- Bulk operations (enrich, sync, enroll, export)
- View detailed contact and company data
- Pagination for large datasets

**Import**:
- Drag & drop CSV upload with field mapping
- Sync from Lemlist campaigns
- Sync from HubSpot lists
- Auto-enrich option
- Import history tracking

**ICP Profiles**:
- Visual profile editor
- Firmographic criteria (size, revenue, industry)
- Target title configuration
- Scoring thresholds (auto-approve, review, disqualify)
- Profile performance stats

**Settings**:
- API key management for all integrations
- Connection testing
- Application preferences
- System information

**YOLO Mode** (Autonomous Operation):
- Fully automated discovery → enrichment → sync → outreach pipeline
- Configurable schedules (cron expressions)
- Daily limits and quality gates
- Safety guardrails
- Real-time monitoring

## Success Indicators

When everything is working:
- ✅ Both terminals show "running" messages
- ✅ http://localhost:5173 shows dashboard
- ✅ http://localhost:3456/health returns JSON
- ✅ Dashboard shows YOLO mode card
- ✅ Navigation works between pages

## Tips for Your Team

### For Non-Technical Users

1. **Use the Desktop Icon**: Easiest way to launch - just double-click
2. **Bookmark the URL**: http://localhost:5173 in your browser
3. **Ask the AI Assistant**: Use 💬 AI Assistant for any questions
4. **Start Small**: Import 10-20 contacts first, then scale up
5. **Check Dashboard Daily**: Monitor YOLO mode and recent activity

### For Power Users

1. **Learn Keyboard Shortcuts**: Faster navigation (see above)
2. **Use Filters**: Contacts view has powerful filtering options
3. **Bulk Actions**: Select multiple contacts for batch operations
4. **Monitor Logs**: Keep `tail -f logs/mcp-server.log` running in a terminal
5. **Export Data**: Regularly export contacts as CSV backup

### For Administrators

1. **Keep Terminals Open**: Don't close them while app is in use
2. **Monitor API Quotas**: Check HubSpot, Lemlist, Explorium usage
3. **Review YOLO Logs**: Watch for errors or rate limit issues
4. **Backup Database**: Copy `.sales-automation/*.db` files regularly
5. **Update API Keys**: Rotate keys quarterly for security

### Best Practices

**Data Quality**:
- Set ICP score threshold ≥ 0.75 for auto-approval
- Review contacts with scores 0.60-0.75 manually
- Only enroll contacts with data quality ≥ 0.70

**Campaign Performance**:
- Monitor reply rates weekly
- Pause campaigns with bounce rate > 5%
- Test new subject lines if open rate < 30%
- Scale up when reply rate > 10%

**YOLO Mode Safety**:
- Start with 20-30 discoveries/day
- Monitor for 1 week before increasing
- Keep daily email limit ≤ 200
- Review activity log daily

## One-Liner Cheat Sheet

```bash
# Install
./install.sh

# Start
./rtgs-sales-automation.sh

# Stop
./stop.sh

# That's it! 🎉
```

---

## Next Steps

### Complete Your Setup

1. **Configure API Keys** → See [Settings View](#1-configure-api-keys-settings-view)
2. **Create ICP Profile** → See [ICP Profiles View](#2-create-your-first-icp-profile)
3. **Import First Contacts** → See [Workflow 2: Import Contacts](#workflow-2-import-contacts-import-view)
4. **Enable YOLO Mode** → See [YOLO Mode Guide](yolo-mode.md)

### Learn More

- **Desktop App Guide**: Complete walkthrough of all 6 views → [desktop-app.md](desktop-app.md)
- **YOLO Mode Guide**: Autonomous operation deep-dive → [yolo-mode.md](yolo-mode.md)
- **RTGS Workflows**: RTGS-specific use cases → [rtgs-quickstart.md](rtgs-quickstart.md)

### Get Help

- **In-App**: Click 💬 AI Assistant and ask questions
- **Documentation**: See [docs/README.md](../README.md) for full index
- **Troubleshooting**: See [section above](#troubleshooting)

---

**Ready to go?** Just run `./rtgs-sales-automation.sh` and open http://localhost:5173! 🚀

**First Time?** Follow the [First Run Walkthrough](#first-run---desktop-app-walkthrough) above.
