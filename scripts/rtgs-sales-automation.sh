#!/bin/bash

# RTGS Sales Automation Launcher
# Starts both MCP server and Desktop app

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
cd ../sales-automation-api
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
