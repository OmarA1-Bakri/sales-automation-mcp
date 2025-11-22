#!/bin/bash

###############################################################################
# RTGS Sales Automation - One-Command Installer
#
# This script installs everything needed to run RTGS Sales Automation:
# - Checks prerequisites
# - Installs dependencies
# - Sets up configuration
# - Creates desktop launcher
# - Creates start/stop scripts
#
# Usage: ./install.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                                                       ║${NC}"
echo -e "${BOLD}║       ${BLUE}RTGS Sales Automation Installer${NC}${BOLD}            ║${NC}"
echo -e "${BOLD}║                                                       ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# 1. Check Prerequisites
# =============================================================================

echo -e "${BLUE}[1/7] Checking prerequisites...${NC}"
echo "-------------------------------------------"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

echo ""

# =============================================================================
# 2. Install API Server Dependencies
# =============================================================================

echo -e "${BLUE}[2/7] Installing API Server dependencies...${NC}"
echo "-------------------------------------------"

cd sales-automation-api
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⚠  Dependencies already installed, skipping...${NC}"
else
    echo "Installing 173 packages (this may take a minute)..."
    npm install --quiet
    echo -e "${GREEN}✓ API Server dependencies installed${NC}"
fi
cd ..

echo ""

# =============================================================================
# 3. Install Desktop App Dependencies
# =============================================================================

echo -e "${BLUE}[3/7] Installing Desktop App dependencies...${NC}"
echo "-------------------------------------------"

cd desktop-app
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⚠  Dependencies already installed, skipping...${NC}"
else
    echo "Installing 580 packages (this may take a minute)..."
    npm install --quiet
    echo -e "${GREEN}✓ Desktop App dependencies installed${NC}"
fi
cd ..

echo ""

# =============================================================================
# 4. Create Configuration
# =============================================================================

echo -e "${BLUE}[4/7] Setting up configuration...${NC}"
echo "-------------------------------------------"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file from template${NC}"
    echo -e "${YELLOW}⚠  Edit .env to add your API keys${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Create data directory
mkdir -p .sales-automation
echo -e "${GREEN}✓ Created data directory${NC}"

echo ""

# =============================================================================
# 5. Create Start Script
# =============================================================================

echo -e "${BLUE}[5/7] Creating launcher scripts...${NC}"
echo "-------------------------------------------"

cat > rtgs-sales-automation.sh << 'LAUNCHER_EOF'
#!/bin/bash

# RTGS Sales Automation Launcher
# Starts both API server and Desktop app

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🚀 Starting RTGS Sales Automation...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"

    if [ ! -z "$API_SERVER_PID" ]; then
        kill $API_SERVER_PID 2>/dev/null
        echo "Stopped API Server"
    fi

    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null
        echo "Stopped Desktop App"
    fi

    echo "Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API Server
echo "Starting API Server..."
cd sales-automation-api
npm start > ../logs/sales-automation-api.log 2>&1 &
API_SERVER_PID=$!
cd ..
echo -e "${GREEN}✓ API Server started (PID: $API_SERVER_PID)${NC}"

# Wait for API server to be ready
sleep 2

# Start Desktop App
echo "Starting Desktop App..."
cd desktop-app
npm run dev > ../logs/desktop-app.log 2>&1 &
APP_PID=$!
cd ..
echo -e "${GREEN}✓ Desktop App started (PID: $APP_PID)${NC}"

echo ""
echo -e "${GREEN}✅ RTGS Sales Automation is running!${NC}"
echo ""
echo "Access points:"
echo "  🌐 Desktop App:  http://localhost:5173"
echo "  🔌 API Server:   http://localhost:3456"
echo ""
echo "Logs:"
echo "  📋 API Server:   tail -f logs/sales-automation-api.log"
echo "  📋 Desktop App:  tail -f logs/desktop-app.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $API_SERVER_PID $APP_PID
LAUNCHER_EOF

chmod +x rtgs-sales-automation.sh
echo -e "${GREEN}✓ Created rtgs-sales-automation.sh${NC}"

# Create logs directory
mkdir -p logs
echo -e "${GREEN}✓ Created logs directory${NC}"

# Create stop script
cat > stop.sh << 'STOP_EOF'
#!/bin/bash
echo "Stopping RTGS Sales Automation..."
pkill -f "sales-automation-api/src/server.js"
pkill -f "vite"
echo "All services stopped"
STOP_EOF

chmod +x stop.sh
echo -e "${GREEN}✓ Created stop.sh${NC}"

echo ""

# =============================================================================
# 6. Create Desktop Icon
# =============================================================================

echo -e "${BLUE}[6/7] Creating desktop launcher...${NC}"
echo "-------------------------------------------"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "linux"* ]]; then
    # Linux - Create .desktop file
    DESKTOP_FILE="$HOME/.local/share/applications/rtgs-sales-automation.desktop"
    mkdir -p "$HOME/.local/share/applications"

    cat > "$DESKTOP_FILE" << DESKTOP_EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=RTGS Sales Automation
Comment=Automated sales prospecting and outreach
Exec=$SCRIPT_DIR/rtgs-sales-automation.sh
Icon=$SCRIPT_DIR/desktop-app/public/icon.png
Terminal=true
Categories=Office;Business;
Keywords=sales;automation;crm;
DESKTOP_EOF

    chmod +x "$DESKTOP_FILE"

    # Try to update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ Created desktop launcher${NC}"
    echo -e "  Location: $DESKTOP_FILE"
    echo -e "${YELLOW}  Search for 'RTGS Sales Automation' in your app menu${NC}"

elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - Create alias
    DESKTOP_PATH="$HOME/Desktop/RTGS Sales Automation.command"
    cat > "$DESKTOP_PATH" << MACOS_EOF
#!/bin/bash
cd "$SCRIPT_DIR"
./rtgs-sales-automation.sh
MACOS_EOF
    chmod +x "$DESKTOP_PATH"
    echo -e "${GREEN}✓ Created desktop shortcut${NC}"
    echo -e "  Location: $DESKTOP_PATH"

else
    # WSL or other - Just show instructions
    echo -e "${YELLOW}⚠  Desktop integration not available for this OS${NC}"
    echo -e "  Run: ./rtgs-sales-automation.sh to start"
fi

echo ""

# =============================================================================
# 7. Create Simple Icon
# =============================================================================

echo -e "${BLUE}[7/7] Creating app icon...${NC}"
echo "-------------------------------------------"

# Create a simple SVG icon
mkdir -p desktop-app/public
cat > desktop-app/public/icon.svg << 'SVG_EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0052a3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="white" text-anchor="middle">R</text>
</svg>
SVG_EOF

echo -e "${GREEN}✓ Created app icon${NC}"

echo ""

# =============================================================================
# Installation Complete
# =============================================================================

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                                                       ║${NC}"
echo -e "${BOLD}║       ${GREEN}✅ Installation Complete!${NC}${BOLD}                   ║${NC}"
echo -e "${BOLD}║                                                       ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BOLD}Next Steps:${NC}"
echo ""
echo "1. ${BOLD}Configure API Keys${NC} (optional for testing):"
echo "   ${BLUE}nano .env${NC}"
echo ""
echo "2. ${BOLD}Start the application:${NC}"
echo "   ${GREEN}./rtgs-sales-automation.sh${NC}"
echo ""
echo "   Or search for 'RTGS Sales Automation' in your app menu"
echo ""
echo "3. ${BOLD}Access the application:${NC}"
echo "   Open browser: ${BLUE}http://localhost:5173${NC}"
echo ""
echo "4. ${BOLD}Stop the application:${NC}"
echo "   Press ${YELLOW}Ctrl+C${NC} or run: ${BLUE}./stop.sh${NC}"
echo ""

echo -e "${BOLD}Useful Commands:${NC}"
echo "  Start:  ${GREEN}./rtgs-sales-automation.sh${NC}"
echo "  Stop:   ${GREEN}./stop.sh${NC}"
echo "  Logs:   ${GREEN}tail -f logs/sales-automation-api.log${NC}"
echo "  Test:   ${GREEN}./test-local.sh${NC}"
echo ""

echo -e "${BOLD}Documentation:${NC}"
echo "  📚 API Server:    sales-automation-api/README.md"
echo "  📚 Desktop App:   desktop-app/README.md"
echo "  📚 Architecture:  ARCHITECTURE.md"
echo "  📚 Testing:       TESTING_SUMMARY.md"
echo ""

echo -e "${GREEN}🚀 Ready to launch! Run ./rtgs-sales-automation.sh${NC}"
echo ""
