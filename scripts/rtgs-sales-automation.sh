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

    if [ ! -z "$MCP_PID" ]; then
        kill $MCP_PID 2>/dev/null
        echo "Stopped MCP Server"
    fi

    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null
        echo "Stopped Desktop App"
    fi

    echo "Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start MCP Server
echo "Starting MCP Server..."
cd mcp-server
npm run api-server > ../logs/mcp-server.log 2>&1 &
MCP_PID=$!
cd ..
echo -e "${GREEN}✓ MCP Server started (PID: $MCP_PID)${NC}"

# Wait for MCP server to be ready
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
echo "  🔌 MCP Server:   http://localhost:3456"
echo ""
echo "Logs:"
echo "  📋 MCP Server:   tail -f logs/mcp-server.log"
echo "  📋 Desktop App:  tail -f logs/desktop-app.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $MCP_PID $APP_PID
