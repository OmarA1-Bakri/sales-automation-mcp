# Desktop App User Guide

Complete guide to using the RTGS Sales Automation desktop application.

---

## Overview

The desktop app provides a beautiful, intuitive interface for managing your entire sales automation workflow. No command line required - everything is visual and point-and-click.

**Key Benefits**:
- 🎯 **Visual Interface** - Modern, dark-themed UI with clear navigation
- 🤖 **AI Assistant** - Chat with Claude for help and guidance
- 📊 **Real-Time Updates** - See activity as it happens via WebSocket
- 🔄 **Complete Workflow** - Discovery → Enrichment → Sync → Outreach
- 🎨 **Professional Design** - Built with React, Tailwind CSS, Electron

---

## Installation & Setup

### First-Time Installation

1. **Run the Installer**:
   ```bash
   ./install.sh
   ```

   This will:
   - Install all dependencies (~753 packages)
   - Initialize the SQLite database
   - Create configuration directories
   - Set up logging

2. **Configure API Keys** (Optional for testing):
   - Edit `.env` file in the project root
   - Add your API keys:
     ```
     HUBSPOT_API_KEY=your_key_here
     LEMLIST_API_KEY=your_key_here
     EXPLORIUM_API_KEY=your_key_here
     ANTHROPIC_API_KEY=your_key_here
     ```

3. **Launch the App**:
   ```bash
   ./rtgs-sales-automation.sh
   ```

4. **Open in Browser**:
   - Navigate to http://localhost:5173
   - The app should load automatically

### System Requirements

- **Node.js**: 18 or higher
- **npm**: Included with Node.js
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 500MB free space

---

## Interface Overview

### Navigation Sidebar

The left sidebar provides quick access to all 6 main views:

1. **Dashboard** 📊 - Overview and metrics
2. **AI Assistant** 💬 - Chat with Claude
3. **Campaigns** 📣 - Manage outreach campaigns
4. **Contacts** 👥 - View and manage contacts
5. **Import** 📥 - Import data from multiple sources
6. **ICP Profiles** 🎯 - Define ideal customers
7. **Settings** ⚙️ - Configure integrations

**YOLO Mode Indicator**: When YOLO mode is active, you'll see a green pulsing indicator at the top of the sidebar showing autonomous status.

### Title Bar

The top title bar displays:
- App name: "RTGS Sales Automation"
- Window controls (minimize, maximize, close)

---

## Dashboard View

**Purpose**: Central hub for monitoring activity and controlling YOLO mode.

### Key Metrics Cards

Four metric cards show real-time stats:

1. **Total Contacts**
   - Count of imported contacts
   - Trend indicator (up/down)
   - Color: Blue

2. **Active Campaigns**
   - Number of running campaigns
   - Trend indicator
   - Color: Purple

3. **Emails Sent**
   - Total outreach emails
   - Trend indicator
   - Color: Green

4. **Replies**
   - Email responses received
   - Reply rate percentage
   - Color: Amber

### YOLO Mode Control Panel

**What is YOLO Mode?**
YOLO (You Only Live Once) mode enables fully autonomous sales automation. When enabled, the system automatically:
- Discovers new leads matching your ICP
- Enriches contacts with data
- Syncs to HubSpot
- Enrolls in email campaigns
- Monitors replies

**Controls**:
- **Enable/Disable Button** - Toggle autonomous operation
- **Pause/Resume** - Temporarily halt automation
- **Emergency Stop** - Immediately stop all activity

**Status Indicators**:
- 🟢 Green: Running
- 🟡 Yellow: Paused
- 🔴 Red: Stopped
- ⚪ Gray: Disabled

**Configuration**:
Click "Configure YOLO" to set:
- Daily discovery limits (default: 50 contacts/day)
- Quality thresholds (minimum ICP score)
- Schedule (cron expression)
- Enabled workflows (discovery, enrichment, sync, outreach)

### Quick Actions

Shortcut buttons for common tasks:
- **Discover Leads** - Launch discovery workflow
- **Enrich Contacts** - Enrich selected contacts
- **Sync to HubSpot** - Push contacts to CRM
- **Create Campaign** - Start new outreach campaign

### Recent Activity Feed

Live feed showing:
- Latest jobs executed
- Status (completed, failed, in progress)
- Timestamps
- Quick links to related views

**Activity Types**:
- 🔍 Discovery - New leads found
- ⚡ Enrichment - Contacts enriched
- 🔄 Sync - CRM updates
- 📧 Outreach - Campaign enrollment
- 💬 Reply - Email responses

---

## AI Assistant View

**Purpose**: Natural language help and guidance powered by Claude Haiku 4-5.

### How to Use

1. **Type Your Question**:
   - Use plain English
   - Be specific about what you need help with
   - Example: "How do I import contacts from CSV?"

2. **Send Message**:
   - Press Enter or click Send button
   - Messages are rate-limited to 10 per minute

3. **Review Response**:
   - Claude provides context-aware answers
   - Includes step-by-step instructions
   - May suggest relevant workflows

### Example Questions

**Getting Started**:
- "How do I set up my first campaign?"
- "What are ICP profiles?"
- "How do I enable YOLO mode?"

**Troubleshooting**:
- "Why isn't my import working?"
- "How do I fix sync errors?"
- "What does 'enrichment failed' mean?"

**Workflows**:
- "Walk me through importing contacts"
- "How do I create an ICP profile?"
- "What's the best way to test campaigns?"

**Technical**:
- "Where are API keys stored?"
- "How do I check job status?"
- "What are the rate limits?"

### Conversation History

- All conversations are saved locally
- Access past conversations via dropdown
- Each conversation has a unique ID
- History persists across app restarts

### Rate Limiting

To protect Claude API quota:
- **Limit**: 10 messages per minute
- **Warning**: You'll see a notification when approaching limit
- **Error**: 429 response with retry time when exceeded

---

## Campaigns View

**Purpose**: Create, manage, and monitor email outreach campaigns.

### Campaign List

**Filters**:
- **Status**: All, Active, Paused, Completed, Draft
- **ICP Profile**: Filter by target profile
- **Date Range**: Created within time period

**Columns**:
- Name - Campaign name
- Status - Current state (badge)
- ICP Profile - Target audience
- Enrolled - Number of contacts
- Performance - Open/Reply rates (color-coded)
- Actions - Quick action buttons

**Performance Color Coding**:
- 🟢 Green: Excellent (Reply rate > 10%)
- 🟡 Amber: Good (Reply rate 5-10%)
- 🔴 Red: Poor (Reply rate < 5%)

### Campaign Details

Click a campaign to view detailed analytics:

**Performance Overview**:
- Enrolled count
- Contacted (emails sent)
- Opened (with %)
- Clicked (with %)
- Replied (with %)
- Bounced (with %)
- Unsubscribed

**Email Breakdown by Step**:
Each email in the sequence shows:
- Subject line
- Sent count
- Open rate
- Click rate
- Reply rate
- Bounce rate

**Sequence Progress**:
- Total steps in sequence
- Current step number
- Completion rate (%)
- Visual progress bar

### Campaign Actions

**From List View**:
- **Enroll Leads** - Add contacts to campaign
- **Check Replies** - Monitor for responses
- **Pause/Resume** - Control campaign state
- **View Details** - See full analytics

**From Details View**:
- **Edit Campaign** - Modify settings
- **Export Data** - Download performance CSV
- **Duplicate** - Create copy
- **Delete** - Remove campaign

### Creating a Campaign

1. **Click "Create Campaign"**
2. **Enter Details**:
   - Campaign name
   - Select ICP profile
   - Choose email template
   - Set daily send limit
3. **Configure Sequence**:
   - Add email steps
   - Set delays between steps
   - Preview emails
4. **Review & Launch**:
   - Verify settings
   - Click "Create Campaign"

---

## Contacts View

**Purpose**: Manage imported contacts with filtering, bulk actions, and export.

### Contact Table

**Columns**:
- Email - Contact email address
- Name - First and last name
- Company - Company name
- Title - Job title
- ICP Score - Matching score (0-1)
- Data Quality - Enrichment quality (0-1)
- Status - Import status badge
- Source - Where imported from
- Actions - Quick actions

**Status Badges**:
- 🔵 Imported - Just added
- 🟢 Enriched - Enrichment complete
- 🟣 Synced - Pushed to HubSpot
- 🟡 Enrolled - In campaign
- 🔴 Failed - Error occurred

### Filtering

**By Source**:
- All sources
- CSV upload
- Lemlist
- HubSpot
- Explorium
- Manual entry

**By Status**:
- All statuses
- Imported
- Enriched
- Synced
- Enrolled

**By ICP Score**:
- Slider: 0.0 to 1.0
- Shows only contacts above threshold

**By Quality Score**:
- Slider: 0.0 to 1.0
- Filter by enrichment quality

**Search**:
- By email
- By name
- By company
- Real-time filtering

### Bulk Actions

**Select Contacts**:
- Click checkbox in header to select all
- Click individual checkboxes to select specific contacts
- Selection count shown in footer

**Actions**:
1. **Enrich Selected** - Enrich with Explorium
2. **Sync to HubSpot** - Push to CRM
3. **Add to Campaign** - Enroll in outreach
4. **Export CSV** - Download data
5. **Delete** - Remove contacts

**Bulk Action Workflow**:
- Select contacts
- Choose action from dropdown
- Confirm in modal
- Job added to queue
- Monitor progress in Dashboard

### Pagination

- **Page Size**: 50 contacts per page
- **Navigation**: Previous, Next, Jump to page
- **Total Count**: Shows X of Y contacts
- **Performance**: Efficient for large datasets

### Contact Details (Modal)

Click a contact row to view full details:

**Personal Info**:
- Full name
- Email (verified status)
- Phone number
- LinkedIn URL
- Location

**Company Info**:
- Company name
- Domain
- Industry
- Employee count
- Revenue
- Technologies used

**Enrichment Data**:
- ICP score breakdown
- Quality score details
- Data sources used
- Enriched timestamp
- Intelligence (pain points, hooks)

**Activity Timeline**:
- Import date
- Enrichment date
- Sync date
- Campaign enrollment
- Email opens/clicks
- Replies

---

## Import View

**Purpose**: Import contacts from multiple sources with field mapping.

### Import Sources

Three tabs for different sources:

#### 1. CSV Upload

**Steps**:
1. **Drag & Drop File**:
   - Drop CSV file onto upload zone
   - Or click to browse

2. **Map Fields**:
   - Auto-mapping attempts to match columns
   - Manually select mapping for each field:
     - Email (required)
     - First Name
     - Last Name
     - Company
     - Title
     - Phone
     - LinkedIn URL
   - Preview shows first 5 rows

3. **Configure Options**:
   - Auto-enrich after import
   - Auto-sync to HubSpot
   - Skip duplicates

4. **Import**:
   - Click "Import Contacts"
   - Job added to queue
   - Progress shown in Dashboard

**CSV Format Requirements**:
- UTF-8 encoding
- Header row required
- Email column mandatory
- Max file size: 10MB
- Max rows: 10,000

**Common Issues**:
- "Invalid CSV format" → Check encoding (must be UTF-8)
- "Missing email column" → Ensure email field mapped
- "Duplicate emails" → Enable "Skip duplicates" option

#### 2. Lemlist Sync

**Steps**:
1. **Connect Lemlist**:
   - Enter API key in Settings first
   - Connection status shown

2. **Select Campaign**:
   - Dropdown shows all Lemlist campaigns
   - Preview shows contact count

3. **Configure Import**:
   - Import all or filtered contacts
   - Auto-enrich option
   - Auto-sync to HubSpot

4. **Import**:
   - Click "Sync from Lemlist"
   - Fetches contacts via API
   - Progress in Dashboard

**What Gets Imported**:
- Email address
- Name (if available)
- Custom variables from Lemlist
- Campaign enrollment status
- Email activity (opens, clicks, replies)

#### 3. HubSpot Sync

**Steps**:
1. **Connect HubSpot**:
   - Enter API key in Settings
   - Connection status shown

2. **Select Filter**:
   - All contacts
   - By list
   - By property
   - Created/modified date range

3. **Configure Import**:
   - Properties to import
   - Auto-enrich option
   - Update existing contacts

4. **Import**:
   - Click "Sync from HubSpot"
   - Batch fetch via API
   - Progress tracking

**What Gets Imported**:
- All standard properties
- Custom properties
- Company associations
- Activity timeline
- Last modified timestamp

### Import History

Table showing recent imports:
- Source
- Contact count
- Status (completed, failed, in progress)
- Started/completed timestamps
- Error details (if failed)

**Actions**:
- View imported contacts
- Re-run import
- Export error log

---

## ICP Profiles View

**Purpose**: Define and manage ideal customer profiles for targeted prospecting.

### Profile List Sidebar

**Display**:
- Profile name
- Active/Inactive status toggle
- Contact count stats
- Average ICP score

**Actions**:
- Select profile to view details
- Toggle active status
- Create new profile
- Delete profile

### Profile Details Panel

When a profile is selected, shows:

**Overview**:
- Profile name
- Description
- Tier (Core, Growth, Strategic)
- Active status

**Stats Dashboard**:
- Discovered: Total companies found
- Enriched: Companies enriched
- Enrolled: Contacts in campaigns
- Avg Score: Average ICP match score

**Firmographic Criteria**:

1. **Company Size** (employees):
   - Min: 10
   - Max: 2000
   - Visual range slider

2. **Industries** (tags):
   - Payment Service Provider
   - PSP
   - Cross-border Payments
   - Fintech
   - Add/remove industries

3. **Revenue Range**:
   - Min: $5M
   - Max: $500M
   - Currency selector

4. **Geographies** (multi-select):
   - United Kingdom
   - Germany
   - Singapore
   - Hong Kong
   - UAE

5. **Technologies** (optional):
   - Stripe
   - AWS
   - Salesforce
   - Custom tech stack

**Target Titles**:

- **Primary Titles** (required):
  - Head of Treasury
  - VP Treasury
  - Treasury Director
  - Treasury Manager

- **Secondary Titles** (backup):
  - Head of Operations
  - VP Operations
  - CFO
  - Head of Payments

**Scoring Thresholds**:

Visual progress bars showing:
- **Auto-Approve**: 0.75 (green zone)
  - Automatically approved for enrichment
- **Review Required**: 0.60 (amber zone)
  - Requires manual review
- **Disqualify**: 0.45 (red zone)
  - Automatically rejected

### Profile Actions

**Test Scoring**:
- Runs discovery against profile
- Shows sample results
- Displays score distribution
- No contacts actually imported

**Discover Leads**:
- Launches discovery job
- Finds companies matching criteria
- Creates job in queue
- Results viewable in Contacts

**Edit Profile**:
- Modify criteria
- Update thresholds
- Save changes

**Activate/Deactivate**:
- Active profiles used in YOLO mode
- Inactive profiles skipped

**Delete Profile**:
- Confirmation required
- Cannot delete if campaigns exist
- Archive option available

### Creating a New Profile

1. **Click "Create Profile"**
2. **Enter Basic Info**:
   - Name (required)
   - Description
   - Tier selection
3. **Set Firmographics**:
   - Company size range
   - Industries (multi-select)
   - Revenue range
   - Geographies
4. **Define Titles**:
   - Primary titles (at least 1)
   - Secondary titles (optional)
5. **Set Thresholds**:
   - Adjust sliders
   - Preview scoring
6. **Save & Activate**:
   - Click "Create Profile"
   - Option to test immediately

---

## Settings View

**Purpose**: Configure API integrations and application preferences.

### API Keys Section

**HubSpot CRM**:
- **API Key Input**: Private App Access Token
- **Test Connection**: Validates key
- **Status**: Connected / Disconnected
- **Scope Check**: Lists available permissions
- **Documentation**: Link to HubSpot docs

**Lemlist**:
- **API Key Input**: Lemlist API key
- **Test Connection**: Validates key
- **Status**: Connected / Disconnected
- **Team Info**: Shows account details
- **Documentation**: Link to Lemlist docs

**Explorium** (Optional):
- **API Key Input**: Explorium API key
- **Test Connection**: Validates key
- **Status**: Connected / Disconnected
- **Credits**: Shows remaining credits
- **Documentation**: Link to Explorium docs

**Anthropic AI** (For Chat):
- **API Key Input**: Anthropic API key
- **Model**: claude-haiku-4-5-20250617
- **Rate Limit**: 10 messages/minute
- **Status**: Connected / Disconnected

**Apollo.io** (Optional):
- **API Key Input**: Apollo API key
- **Test Connection**: Validates key
- **Status**: Connected / Disconnected

### Application Settings

**Appearance**:
- Theme: Dark (default) / Light
- Sidebar: Always open / Auto-hide
- Notifications: Toast position

**Data & Storage**:
- Database Location: .sales-automation/
- Cache Duration: 30 days
- Log Retention: 90 days
- Clear Cache button

**Performance**:
- Batch Size: 100 contacts
- Concurrent Jobs: 3
- Rate Limit Buffer: 80%
- WebSocket Reconnect: Auto

**Privacy**:
- Local Storage Only: ✅
- Analytics: Disabled
- Error Reporting: Local only
- API Key Encryption: File-based

### System Information

**Version**:
- App Version: 1.0.0
- Node.js Version: 18.x
- Database Size: X MB
- Log Size: Y MB

**Status Indicators**:
- Database: ✅ Connected
- API Server: ✅ Running (port 3000)
- WebSocket: ✅ Connected
- Job Queue: ✅ Processing

**Actions**:
- Export Logs
- Reset Database (with confirmation)
- Clear All Data (with confirmation)
- Check for Updates

---

## Common Workflows

### Workflow 1: Import and Enrich CSV Contacts

1. Navigate to **Import** view
2. Select **CSV Upload** tab
3. Drag & drop your CSV file
4. Map fields (email required)
5. Enable "Auto-enrich after import"
6. Click "Import Contacts"
7. Monitor progress in **Dashboard**
8. View enriched contacts in **Contacts** view
9. Filter by Data Quality > 0.7
10. Bulk sync to HubSpot

**Time**: ~10 minutes for 100 contacts

### Workflow 2: Create and Launch Campaign

1. Navigate to **ICP Profiles**
2. Select target profile (or create new)
3. Click "Discover Leads"
4. Wait for discovery to complete
5. Navigate to **Contacts**
6. Filter by ICP Score > 0.75
7. Select discovered contacts
8. Click "Add to Campaign"
9. Navigate to **Campaigns**
10. Click "Create Campaign"
11. Enter campaign details
12. Configure email sequence
13. Click "Launch Campaign"
14. Monitor performance in **Campaigns** view

**Time**: ~30 minutes setup, ongoing monitoring

### Workflow 3: Enable YOLO Mode

1. Configure **ICP Profiles** (at least 1 active)
2. Configure API keys in **Settings**
3. Navigate to **Dashboard**
4. Click "Configure YOLO"
5. Set daily limits (start conservative: 10-20/day)
6. Set quality thresholds (0.75+ recommended)
7. Configure schedule (e.g., "0 9 * * *" for 9 AM daily)
8. Enable workflows (all or selective)
9. Click "Save Configuration"
10. Click "Enable YOLO Mode"
11. Monitor in **Dashboard** activity feed
12. Review results daily

**Time**: ~1 hour initial setup, then autonomous

---

## Troubleshooting

### App Won't Start

**Symptoms**: Launcher script fails or app doesn't load

**Solutions**:
1. Check Node.js version: `node --version` (must be 18+)
2. Reinstall dependencies: `npm install`
3. Check logs: `tail -f logs/mcp-server.log`
4. Verify ports available: `lsof -i :3000` and `lsof -i :5173`
5. Kill conflicting processes
6. Restart: `./stop.sh && ./rtgs-sales-automation.sh`

### Import Fails

**Symptoms**: "Import failed" error in Import view

**Common Causes**:
- **Invalid CSV format** → Check UTF-8 encoding
- **Missing email column** → Ensure email field mapped
- **API key invalid** → Test connection in Settings
- **Network error** → Check internet connection
- **Rate limit exceeded** → Wait and retry

**Solutions**:
1. Validate CSV format (UTF-8, header row)
2. Test with small file (10 rows) first
3. Check API connection in Settings
4. Review error details in Import History
5. Export error log for debugging

### Enrichment Not Working

**Symptoms**: Contacts stuck in "Imported" status

**Common Causes**:
- **No Explorium API key** → Add in Settings
- **API quota exhausted** → Check credits
- **Invalid email addresses** → Verify data quality
- **Rate limit hit** → Jobs queued, processing slowly

**Solutions**:
1. Verify Explorium API key in Settings
2. Check API credits/quota
3. Review job queue in Dashboard
4. Manually trigger: Select contacts → Enrich
5. Check logs for specific errors

### Sync to HubSpot Fails

**Symptoms**: Contacts not appearing in HubSpot

**Common Causes**:
- **Invalid API key** → Test connection
- **Insufficient permissions** → Check scopes
- **Duplicate records** → HubSpot rejection
- **Invalid data** → Missing required fields

**Solutions**:
1. Test HubSpot connection in Settings
2. Verify API key has crm.objects.contacts.write permission
3. Check HubSpot for existing records
4. Ensure email is valid
5. Review sync log for details

### YOLO Mode Not Running

**Symptoms**: Activity feed shows no recent jobs

**Common Causes**:
- **No active ICP profiles** → Create/activate profile
- **Schedule not configured** → Check YOLO config
- **YOLO mode paused** → Resume from Dashboard
- **Daily limit reached** → Check limits in config

**Solutions**:
1. Verify at least 1 ICP profile active
2. Check YOLO configuration (click "Configure YOLO")
3. Ensure status is "Running" not "Paused"
4. Review activity log for errors
5. Manually trigger test cycle

### High Memory Usage

**Symptoms**: App slow or browser crashes

**Common Causes**:
- **Large contact import** → Processing in background
- **WebSocket connection issues** → Reconnection loops
- **Browser cache** → Too much data stored

**Solutions**:
1. Process large imports in smaller batches
2. Close unused browser tabs
3. Clear browser cache
4. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
5. Restart app

---

## Best Practices

### Data Management

1. **Start Small**: Import 10-50 contacts first to test workflow
2. **Verify Quality**: Check enrichment quality before bulk operations
3. **Regular Cleanup**: Delete failed jobs, clear cache monthly
4. **Export Backups**: Export contact data weekly
5. **Monitor Duplicates**: Use filters to find duplicate emails

### Campaign Optimization

1. **Test Sequences**: Start with 1-2 email sequences
2. **Monitor Metrics**: Check open/reply rates daily
3. **Iterate Content**: Test different subject lines
4. **Segment Audiences**: Use ICP profiles to target
5. **Respect Limits**: Don't exceed 200 emails/day

### YOLO Mode Safety

1. **Test Mode First**: Enable test mode before production
2. **Conservative Limits**: Start with 10-20 prospects/day
3. **High Quality Bar**: Set ICP threshold to 0.75+
4. **Daily Monitoring**: Review activity every morning
5. **Emergency Stop**: Know how to pause immediately

### Performance

1. **Pagination**: Use filters to reduce table size
2. **Batch Operations**: Select 50-100 contacts max
3. **Cache Wisely**: Don't clear cache unnecessarily
4. **Schedule Smart**: Run discovery off-peak hours
5. **Monitor Logs**: Check for errors regularly

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + 1` | Go to Dashboard |
| `Ctrl/Cmd + 2` | Go to AI Chat |
| `Ctrl/Cmd + 3` | Go to Campaigns |
| `Ctrl/Cmd + 4` | Go to Contacts |
| `Ctrl/Cmd + 5` | Go to Import |
| `Ctrl/Cmd + 6` | Go to ICP Profiles |
| `Ctrl/Cmd + ,` | Open Settings |
| `Ctrl/Cmd + R` | Refresh current view |
| `Ctrl/Cmd + F` | Focus search |
| `Escape` | Close modal/dialog |

---

## Next Steps

Now that you understand the desktop app:

1. **Read**: [YOLO Mode Guide](yolo-mode.md) - Set up autonomous operation
2. **Try**: [RTGS Quickstart](rtgs-quickstart.md) - RTGS-specific workflows
3. **Learn**: [Integration Details](../technical/integrations.md) - Deep dive on APIs

---

**Need Help?** Use the AI Assistant in the app - just ask your question!
