#!/bin/bash

# Task Router - Installation Script
# Version: 1.0.0

set -e  # Exit on error

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Task Router - Installation Script v1.0.0            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect installation directory
INSTALL_DIR="${1:-$PWD}"
PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}Installation directory:${NC} $INSTALL_DIR"
echo -e "${BLUE}Package directory:${NC} $PACKAGE_DIR"
echo ""

# Confirm installation
read -p "Install Task Router to $INSTALL_DIR? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Installation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Creating directory structure${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create directories
mkdir -p "$INSTALL_DIR/.claude/commands"
mkdir -p "$INSTALL_DIR/skills/task-router"
mkdir -p "$INSTALL_DIR/docs/task-router"
mkdir -p "$INSTALL_DIR/scripts"

echo -e "${GREEN}✓${NC} Directories created"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Installing core files${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Copy slash command
if [ -f "$PACKAGE_DIR/.claude/commands/task-router.md" ]; then
    cp "$PACKAGE_DIR/.claude/commands/task-router.md" "$INSTALL_DIR/.claude/commands/"
    echo -e "${GREEN}✓${NC} Installed slash command: .claude/commands/task-router.md"
else
    echo -e "${RED}✗${NC} Missing: .claude/commands/task-router.md"
    exit 1
fi

# Copy skill files
if [ -f "$PACKAGE_DIR/skills/task-router/skill.md" ]; then
    cp "$PACKAGE_DIR/skills/task-router/skill.md" "$INSTALL_DIR/skills/task-router/"
    echo -e "${GREEN}✓${NC} Installed skill: skills/task-router/skill.md"
else
    echo -e "${RED}✗${NC} Missing: skills/task-router/skill.md"
    exit 1
fi

if [ -f "$PACKAGE_DIR/skills/task-router/README.md" ]; then
    cp "$PACKAGE_DIR/skills/task-router/README.md" "$INSTALL_DIR/skills/task-router/"
    echo -e "${GREEN}✓${NC} Installed README: skills/task-router/README.md"
fi

if [ -f "$PACKAGE_DIR/skills/task-router/QUICK_REFERENCE.md" ]; then
    cp "$PACKAGE_DIR/skills/task-router/QUICK_REFERENCE.md" "$INSTALL_DIR/skills/task-router/"
    echo -e "${GREEN}✓${NC} Installed quick reference: skills/task-router/QUICK_REFERENCE.md"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Installing documentation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Copy documentation
for doc in TASK_ROUTER_GUIDE.md TASK_ROUTER_SUMMARY.md INSTALLATION_COMPLETE.md; do
    if [ -f "$PACKAGE_DIR/docs/$doc" ]; then
        cp "$PACKAGE_DIR/docs/$doc" "$INSTALL_DIR/docs/task-router/"
        echo -e "${GREEN}✓${NC} Installed: docs/task-router/$doc"
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Installing scripts${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Copy and make scripts executable
if [ -f "$PACKAGE_DIR/scripts/verify-task-router.sh" ]; then
    cp "$PACKAGE_DIR/scripts/verify-task-router.sh" "$INSTALL_DIR/scripts/"
    chmod +x "$INSTALL_DIR/scripts/verify-task-router.sh"
    echo -e "${GREEN}✓${NC} Installed: scripts/verify-task-router.sh (executable)"
fi

if [ -f "$PACKAGE_DIR/scripts/uninstall.sh" ]; then
    cp "$PACKAGE_DIR/scripts/uninstall.sh" "$INSTALL_DIR/scripts/"
    chmod +x "$INSTALL_DIR/scripts/uninstall.sh"
    echo -e "${GREEN}✓${NC} Installed: scripts/uninstall.sh (executable)"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Verifying installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run verification if available
if [ -x "$INSTALL_DIR/scripts/verify-task-router.sh" ]; then
    cd "$INSTALL_DIR"
    ./scripts/verify-task-router.sh
else
    echo -e "${YELLOW}⚠${NC} Verification script not found, skipping verification"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Task Router Installation Complete! ✓                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Quick Start:${NC}"
echo "  /task-router"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  docs/task-router/INSTALLATION_COMPLETE.md"
echo "  docs/task-router/TASK_ROUTER_GUIDE.md"
echo "  skills/task-router/QUICK_REFERENCE.md"
echo ""
echo -e "${BLUE}Verification:${NC}"
echo "  ./scripts/verify-task-router.sh"
echo ""
echo -e "${BLUE}Uninstall:${NC}"
echo "  ./scripts/uninstall.sh task-router"
echo ""
