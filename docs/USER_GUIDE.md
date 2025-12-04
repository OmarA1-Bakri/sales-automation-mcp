# RTGS Sales Automation - User Guide

Welcome to RTGS Sales Automation! This guide will help you get started with the platform.

## Table of Contents

1. [Installation](#installation)
2. [First-Time Setup](#first-time-setup)
3. [Dashboard Overview](#dashboard-overview)
4. [ICP Profiles](#icp-profiles)
5. [Lead Discovery](#lead-discovery)
6. [Campaigns](#campaigns)
7. [AI Assistant](#ai-assistant)
8. [YOLO Mode](#yolo-mode)
9. [Troubleshooting](#troubleshooting)

---

## Installation

### Windows

1. Download the installer from your IT department's software portal
2. Double-click `RTGS Sales Automation Setup.exe`
3. Follow the installation wizard
4. Launch the application from the Start Menu

### macOS

1. Download `RTGS Sales Automation.dmg`
2. Open the DMG file
3. Drag the application to your Applications folder
4. Launch from Applications

### Linux

1. Download `RTGS Sales Automation.AppImage`
2. Make it executable: `chmod +x RTGS*.AppImage`
3. Run the application

---

## First-Time Setup

### Step 1: Configure API Connection

1. Launch the application
2. Click **Settings** (gear icon) in the sidebar
3. Enter your **API Key** (provided by your IT administrator)
4. Verify the **API URL** is correct:
   - Production: `https://sales-api.internal.rtgs.global`
5. Click **Test Connection**
6. If successful, click **Save Settings**

### Step 2: Create Your First ICP Profile

An ICP (Ideal Customer Profile) defines what makes a great prospect for your business.

1. Go to **ICP Profiles** in the sidebar
2. Click **Create New Profile**
3. Fill in:
   - **Name**: e.g., "Enterprise FinTech CTOs"
   - **Description**: Who this profile targets
   - **Company Size**: Min/Max employees
   - **Revenue Range**: Target company revenue
   - **Industries**: Add relevant industries
   - **Job Titles**: Primary decision-maker titles
4. Adjust **Scoring Thresholds**:
   - Auto-Approve: 85%+ match → automatically qualified
   - Review: 70-85% → needs human review
   - Disqualify: Below 50% → not a fit
5. Click **Create Profile**

---

## Dashboard Overview

The Dashboard is your command center showing:

| Section | Description |
|---------|-------------|
| **Stats Cards** | Key metrics (leads discovered, contacts enriched, emails sent) |
| **Recent Activity** | Timeline of system actions |
| **YOLO Controls** | Enable/disable autonomous mode |
| **Quick Actions** | Common tasks (discover leads, enrich contacts) |

---

## ICP Profiles

### Creating Profiles

- **Core** tier: Primary target audience
- **Expansion** tier: Secondary opportunities
- **Experimental** tier: Testing new markets

### Testing Profiles

1. Select a profile
2. Click **Test Score**
3. Enter sample company data
4. See how well it matches your criteria

### Discovering Leads

1. Select a profile
2. Click **Discover Leads**
3. Choose how many leads to find (10-100)
4. Review discovered leads in Contacts

---

## Lead Discovery

The platform automatically finds leads matching your ICP using:

- Company databases (Explorium)
- LinkedIn (via PhantomBuster)
- Public business registries

### Manual Discovery

1. Go to **Contacts** page
2. Click **Discover New**
3. Select an ICP profile
4. Specify quantity
5. Review results

### Enrichment

After discovery, leads are automatically enriched with:
- Email addresses
- Phone numbers
- Social profiles
- Company details
- Recent news

---

## Campaigns

### Campaign Types

| Type | Description |
|------|-------------|
| **Email** | Automated email sequences via Lemlist |
| **LinkedIn** | Connection requests and messages |
| **Video** | Personalized video outreach via HeyGen |
| **Multi-channel** | Combined approach |

### Creating a Campaign

1. Go to **Campaigns** page
2. Click **Create Campaign**
3. Fill in:
   - **Name**: Descriptive campaign name
   - **Type**: Email, LinkedIn, Video, or Multi-channel
   - **Target ICP**: Which profile to target
4. Configure sequence steps
5. Set scheduling (days, times, intervals)
6. Click **Create**

### Activating a Campaign

1. Select the campaign
2. Review all settings
3. Click **Activate**
4. Monitor progress in Dashboard

---

## AI Assistant

The AI Assistant helps you with:

- **Strategy**: "What's the best approach for enterprise sales?"
- **Analysis**: "Analyze my campaign performance"
- **Discovery**: "Find 25 leads matching FinTech CTO profile"
- **Enrichment**: "Enrich my latest contacts"
- **Writing**: "Draft an email for cold outreach to CTOs"

### Quick Actions

Click the suggested prompts for common tasks:
- 📊 Pipeline Stats
- 🎯 Discover Leads
- ✨ Enrich Contacts
- 📧 Draft Email

### Tips

- Be specific: "Find 10 leads in the SaaS industry with >100 employees"
- Ask follow-ups: "Tell me more about the top 3 leads"
- Request actions: "Add these leads to the Enterprise campaign"

---

## YOLO Mode

**YOLO (You Only Lead Once) Mode** enables fully autonomous operation:

### What It Does

- Continuously discovers new leads
- Automatically enriches contacts
- Enrolls qualified leads in campaigns
- Monitors responses and adjusts

### Enabling YOLO Mode

1. **Prerequisites**:
   - At least one ICP profile configured
   - At least one active campaign
   - API integrations connected (in Settings)

2. **Enable**:
   - Dashboard → YOLO Controls → Toggle ON
   - Or: AI Assistant → "Enable YOLO mode"

3. **Monitoring**:
   - Watch the activity feed
   - Review daily reports
   - Check campaign metrics

### Safety Controls

| Control | Description |
|---------|-------------|
| **Pause** | Temporarily stop all actions |
| **Daily Limits** | Max leads per day |
| **Approval Threshold** | Require review below 85% match |
| **Emergency Stop** | Immediately halt all operations |

---

## Troubleshooting

### Connection Failed

**Symptoms**: "Unable to connect to API" error

**Solutions**:
1. Check if you're on the corporate network (VPN required if remote)
2. Verify API URL in Settings
3. Test your API key with IT
4. Check if the server is online: `https://sales-api.internal.rtgs.global/health`

### 401 Unauthorized

**Symptoms**: "Authentication failed" error

**Solutions**:
1. Re-enter your API key in Settings
2. Request a new API key from IT
3. Check if your key has expired

### Certificate Error

**Symptoms**: SSL/TLS certificate warning

**Solutions**:
1. Contact IT to install the internal CA certificate
2. Ensure your system time is correct
3. Try clearing browser/app cache

### Slow Performance

**Symptoms**: App is sluggish or unresponsive

**Solutions**:
1. Check your internet connection
2. Close other resource-heavy applications
3. Restart the application
4. Report to IT if persistent

### AI Assistant Not Responding

**Symptoms**: Chat doesn't show responses

**Solutions**:
1. Wait 30 seconds (AI can take time)
2. Check the activity feed for errors
3. Refresh the page
4. Verify AI integration is enabled in Settings

---

## Getting Help

- **IT Support**: support@rtgs.global
- **In-App**: Use the AI Assistant to ask questions
- **Documentation**: Check the Help menu for more guides

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + /` | Toggle AI Assistant |
| `Ctrl/Cmd + D` | Go to Dashboard |
| `Ctrl/Cmd + C` | Go to Campaigns |
| `Esc` | Close modals |

---

© 2024 RTGS Global - Internal Use Only
