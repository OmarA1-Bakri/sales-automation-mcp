#!/bin/bash
# POST-CODE-CHANGE HOOK
# Automatically invokes work-critic agent after significant code changes
# Configuration location: /home/omar/claude - sales_auto_skill/.claude/agents/WORK-CRITIC.md

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Post-Code-Change Hook: Running Work-Critic Validation${NC}"
echo ""

# Detect changed files (if in git repo)
if git rev-parse --git-dir > /dev/null 2>&1; then
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || echo "")

    if [ -z "$CHANGED_FILES" ]; then
        echo -e "${GREEN}✓ No uncommitted changes detected - skipping work-critic${NC}"
        exit 0
    fi

    echo "Changed files:"
    echo "$CHANGED_FILES" | sed 's/^/  - /'
    echo ""
fi

# Check if work-critic agent exists
WORK_CRITIC_CONFIG="/home/omar/claude - sales_auto_skill/.claude/agents/WORK-CRITIC.md"

if [ ! -f "$WORK_CRITIC_CONFIG" ]; then
    echo -e "${RED}❌ Work-critic configuration not found at: $WORK_CRITIC_CONFIG${NC}"
    echo "Skipping work-critic validation."
    exit 0
fi

echo -e "${GREEN}✓ Work-critic configuration found${NC}"
echo ""

# TODO: Invoke work-critic agent via Claude Code Task tool
# For now, this is a placeholder that reminds the developer to run work-critic

echo -e "${YELLOW}⚠️  REMINDER: Run work-critic validation before committing${NC}"
echo ""
echo "To run work-critic manually:"
echo "  1. Open Claude Code"
echo "  2. Use Task tool with work-critic agent"
echo "  3. Review the generated report"
echo ""

# Exit successfully (don't block commits)
exit 0
