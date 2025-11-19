# RTGS Sales Automation Desktop App

Beautiful, user-friendly desktop application for the RTGS sales automation system. Built with Electron + React for non-technical users.

## Features

### 🎯 Visual, Intuitive Interface
- Clean, modern design with dark theme
- Icon-based navigation - no command line needed
- Clear call-to-action buttons
- Visual feedback for all operations

### 🤖 AI Chat Assistant
- Natural language interaction
- Guided campaign setup
- Help and troubleshooting
- Context-aware suggestions

### ⚡ YOLO Mode Dashboard
- One-click enable/disable
- Real-time status monitoring
- Visual stats and metrics
- Emergency stop button

### 📊 Key Features
1. **Dashboard** - Overview with key metrics and quick actions
2. **AI Assistant** - Chat interface for help and setup
3. **Campaigns** - Visual campaign builder and management
4. **Contacts** - Easy contact management with filtering
5. **Import** - Drag-and-drop CSV import, Lemlist/HubSpot sync
6. **ICP Profiles** - Visual editor for ideal customer profiles
7. **Settings** - API key management, preferences

## Tech Stack

- **Electron** - Desktop app framework
- **React 18** - UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Lucide React** - Beautiful icons
- **Framer Motion** - Smooth animations
- **React Hot Toast** - Notifications

## Prerequisites

- Node.js 18+ installed
- MCP server configured and running
- API keys for HubSpot, Lemlist, Explorium

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for specific platform
npm run build:mac      # macOS
npm run build:win      # Windows
npm run build:linux    # Linux
```

## Development

The app runs in two processes:

1. **Main Process** (`electron/main.js`)
   - Window management
   - MCP server communication
   - File system access
   - System tray

2. **Renderer Process** (React app)
   - UI components
   - State management
   - User interactions

### Project Structure

```
desktop-app/
├── electron/
│   ├── main.js           # Electron main process
│   └── preload.js        # Preload script (IPC bridge)
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── TitleBar.jsx
│   │   ├── Sidebar.jsx
│   │   └── ...
│   ├── pages/            # Main views
│   │   ├── Dashboard.jsx
│   │   ├── ChatPage.jsx
│   │   ├── CampaignsPage.jsx
│   │   └── ...
│   ├── services/         # API layer
│   │   └── api.js
│   ├── store/            # State management
│   │   └── useStore.js
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Key Components

### Dashboard
- YOLO mode status and controls
- Key metrics (contacts, campaigns, emails, replies)
- Quick actions for common tasks
- Recent activity feed

### AI Chat Assistant
- Natural language interface
- Context-aware responses
- Guided workflows
- Help and documentation

### Campaign Builder
- Visual campaign creation
- Email template editor
- Schedule configuration
- Performance tracking

### Import Center
- CSV drag-and-drop
- Lemlist campaign import
- HubSpot CRM sync
- Field mapping wizard

### ICP Profile Editor
- Visual form builder
- Industry selection
- Title patterns
- Company size filters

### Settings
- API key management
- YOLO configuration
- App preferences
- Account settings

## User Guide (For Non-Technical Users)

### Getting Started

1. **Launch the app**
   - Double-click the RTGS Sales Automation icon
   - You'll see the Dashboard

2. **Configure API Keys** (First time only)
   - Click "Settings" in the sidebar
   - Enter your API keys:
     - HubSpot API Key
     - Lemlist API Key
     - Explorium API Key (optional)
   - Click "Save"

3. **Set Up ICP Profiles**
   - Click "ICP Profiles" in sidebar
   - Click "Create Profile"
   - Fill in:
     - Profile name (e.g., "FinTech VP Finance")
     - Industries to target
     - Job titles to look for
     - Company size range
   - Click "Save Profile"

4. **Enable YOLO Mode**
   - Go back to Dashboard
   - Click the big "Enable YOLO" button
   - System will run automatically!

### Daily Usage

**Check Status:**
- Dashboard shows real-time stats
- Green "Active" indicator means YOLO is running
- View today's activity at bottom

**Import Contacts:**
- Click "Import" in sidebar
- Drag and drop CSV file
- OR sync from Lemlist/HubSpot
- Review and confirm

**Chat with AI:**
- Click "AI Assistant" in sidebar
- Type your question
- Get instant help and guidance

**Manage Campaigns:**
- Click "Campaigns" in sidebar
- View active campaigns
- Create new campaigns
- Check performance

### Troubleshooting

**"API Key Invalid" error:**
- Go to Settings
- Re-enter API keys
- Make sure there are no extra spaces

**"YOLO Mode Failed" error:**
- Check Settings → YOLO Configuration
- Ensure at least one ICP profile is active
- Try "Test Mode" first

**Need Help?**
- Click "AI Assistant"
- Type "help"
- Or type your specific question

## Building for Production

### macOS
```bash
npm run build:mac
```
Output: `dist-electron/RTGS Sales Automation.app`

### Windows
```bash
npm run build:win
```
Output: `dist-electron/RTGS Sales Automation Setup.exe`

### Linux
```bash
npm run build:linux
```
Output: `dist-electron/RTGS Sales Automation.AppImage`

## Configuration

The app stores configuration in:
- **macOS**: `~/Library/Application Support/rtgs-sales-automation/`
- **Windows**: `%APPDATA%\rtgs-sales-automation\`
- **Linux**: `~/.config/rtgs-sales-automation/`

Files:
- `config.json` - API keys and preferences
- `.sales-automation/` - YOLO config and database

## Security

- API keys stored locally in encrypted format
- No data sent to external servers (except configured APIs)
- All communication with MCP server via localhost
- Electron security best practices applied

## Support

For questions or issues:
1. Use the in-app AI Assistant
2. Check the troubleshooting guide
3. Contact RTGS support team

## License

MIT License - RTGS Team
