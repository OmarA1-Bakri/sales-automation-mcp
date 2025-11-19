#!/bin/bash

# Task Router - Uninstallation Script
# Version: 1.0.0

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Task Router - Uninstallation Script v1.0.0            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect installation directory
INSTALL_DIR="${1:-$PWD}"

echo -e "${BLUE}Installation directory:${NC} $INSTALL_DIR"
echo ""

# Confirm uninstallation
echo -e "${YELLOW}WARNING: This will remove all Task Router files.${NC}"
read -p "Uninstall Task Router from $INSTALL_DIR? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Uninstallation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Removing Task Router files${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

removed_count=0

# Remove slash command
if [ -f "$INSTALL_DIR/.claude/commands/task-router.md" ]; then
    rm "$INSTALL_DIR/.claude/commands/task-router.md"
    echo -e "${GREEN}✓${NC} Removed: .claude/commands/task-router.md"
    ((removed_count++))
fi

# Remove skill directory
if [ -d "$INSTALL_DIR/skills/task-router" ]; then
    rm -rf "$INSTALL_DIR/skills/task-router"
    echo -e "${GREEN}✓${NC} Removed: skills/task-router/"
    ((removed_count++))
fi

# Remove documentation
if [ -d "$INSTALL_DIR/docs/task-router" ]; then
    rm -rf "$INSTALL_DIR/docs/task-router"
    echo -e "${GREEN}✓${NC} Removed: docs/task-router/"
    ((removed_count++))
fi

# Remove root-level documentation files
for doc in TASK_ROUTER_GUIDE.md TASK_ROUTER_SUMMARY.md INSTALLATION_COMPLETE.md; do
    if [ -f "$INSTALL_DIR/$doc" ]; then
        rm "$INSTALL_DIR/$doc"
        echo -e "${GREEN}✓${NC} Removed: $doc"
        ((removed_count++))
    fi
done

# Remove scripts
if [ -f "$INSTALL_DIR/scripts/verify-task-router.sh" ]; then
    rm "$INSTALL_DIR/scripts/verify-task-router.sh"
    echo -e "${GREEN}✓${NC} Removed: scripts/verify-task-router.sh"
    ((removed_count++))
fi

# Don't remove self until the end
UNINSTALL_SCRIPT="$INSTALL_DIR/scripts/uninstall.sh"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Uninstallation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $removed_count -gt 0 ]; then
    echo -e "${GREEN}✓ Uninstallation complete${NC}"
    echo -e "  Removed $removed_count items"
else
    echo -e "${YELLOW}⚠ No Task Router files found${NC}"
    echo -e "  Task Router may not have been installed"
fi

echo ""
echo -e "${BLUE}Note:${NC} Empty directories may remain and can be safely deleted."
echo ""

# Remove self if it exists
if [ -f "$UNINSTALL_SCRIPT" ]; then
    echo -e "${YELLOW}Removing uninstall script...${NC}"
    rm "$UNINSTALL_SCRIPT"
    echo -e "${GREEN}✓${NC} Done"
fi
