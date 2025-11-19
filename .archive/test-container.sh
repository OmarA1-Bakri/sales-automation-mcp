#!/bin/bash

# RTGS Sales Automation - Container Test Script
# Tests the full stack in Docker container

set -e

echo "🧪 RTGS Sales Automation - Container Testing"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating .env from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys${NC}"
    echo ""
fi

echo "Step 1: Building Docker image..."
echo "--------------------------------"
docker-compose build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo "Step 2: Starting services..."
echo "----------------------------"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo "Step 3: Waiting for services to be ready..."
echo "--------------------------------------------"
sleep 5

# Check MCP Server
echo "Checking MCP Server..."
if curl -s http://localhost:3456/health > /dev/null; then
    echo -e "${GREEN}✓ MCP Server is responding on port 3456${NC}"
else
    echo -e "${RED}❌ MCP Server not responding${NC}"
    echo "Check logs with: docker-compose logs rtgs-sales-automation"
fi

# Check Vite Dev Server
echo "Checking Desktop App Dev Server..."
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✓ Desktop App Dev Server is responding on port 5173${NC}"
else
    echo -e "${YELLOW}⚠️  Desktop App Dev Server not responding yet (may still be starting)${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Test Environment Ready!${NC}"
echo "=============================================="
echo ""
echo "Access Points:"
echo "  🌐 Desktop App UI:  http://localhost:5173"
echo "  🔌 MCP Server API:  http://localhost:3456"
echo ""
echo "Useful Commands:"
echo "  📋 View logs:        docker-compose logs -f"
echo "  🔍 MCP Server logs:  docker-compose logs -f rtgs-sales-automation"
echo "  🛑 Stop services:    docker-compose down"
echo "  🔄 Restart:          docker-compose restart"
echo "  🧹 Clean up:         docker-compose down -v"
echo ""
echo "Testing:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. You should see the RTGS Sales Automation dashboard"
echo "  3. Try enabling YOLO mode (if API keys are configured)"
echo ""
echo "Press Ctrl+C to view logs, or run 'docker-compose logs -f'"
echo ""

# Offer to tail logs
read -p "Would you like to view logs now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose logs -f
fi
