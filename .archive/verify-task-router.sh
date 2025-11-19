#!/bin/bash

# Task Router Installation Verification Script

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        TASK ROUTER - Installation Verification                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
checks_passed=0
checks_total=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    checks_total=$((checks_total + 1))

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $description (MISSING: $file)"
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    local dir=$1
    local description=$2
    checks_total=$((checks_total + 1))

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $description (MISSING: $dir)"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 CHECKING DIRECTORY STRUCTURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_dir ".claude" "Claude commands directory exists"
check_dir ".claude/commands" "Claude commands subdirectory exists"
check_dir "skills" "Skills directory exists"
check_dir "skills/task-router" "Task router skill directory exists"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 CHECKING REQUIRED FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Core files
check_file ".claude/commands/task-router.md" "Slash command interface"
check_file "skills/task-router/skill.md" "Core intelligence engine"
check_file "skills/task-router/README.md" "User guide"
check_file "skills/task-router/QUICK_REFERENCE.md" "Quick reference cheat sheet"

# Documentation
check_file "TASK_ROUTER_GUIDE.md" "Installation & usage guide"
check_file "TASK_ROUTER_SUMMARY.md" "Summary document"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📏 CHECKING FILE SIZES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ".claude/commands/task-router.md" ]; then
    size=$(stat -f%z ".claude/commands/task-router.md" 2>/dev/null || stat -c%s ".claude/commands/task-router.md" 2>/dev/null)
    if [ "$size" -gt 1000 ]; then
        echo -e "${GREEN}✓${NC} Slash command has content ($size bytes)"
    else
        echo -e "${YELLOW}⚠${NC} Slash command file is small ($size bytes)"
    fi
fi

if [ -f "skills/task-router/skill.md" ]; then
    size=$(stat -f%z "skills/task-router/skill.md" 2>/dev/null || stat -c%s "skills/task-router/skill.md" 2>/dev/null)
    if [ "$size" -gt 1000 ]; then
        echo -e "${GREEN}✓${NC} Skill file has content ($size bytes)"
    else
        echo -e "${YELLOW}⚠${NC} Skill file is small ($size bytes)"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 CHECKING CONTENT VALIDITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for frontmatter in slash command
if [ -f ".claude/commands/task-router.md" ]; then
    if grep -q "^name: task-router" ".claude/commands/task-router.md"; then
        echo -e "${GREEN}✓${NC} Slash command has valid frontmatter"
        checks_passed=$((checks_passed + 1))
    else
        echo -e "${RED}✗${NC} Slash command missing frontmatter"
    fi
    checks_total=$((checks_total + 1))
fi

# Check for plugin map in skill
if [ -f "skills/task-router/skill.md" ]; then
    if grep -q "PLUGIN_MAP" "skills/task-router/skill.md"; then
        echo -e "${GREEN}✓${NC} Skill contains PLUGIN_MAP"
        checks_passed=$((checks_passed + 1))
    else
        echo -e "${YELLOW}⚠${NC} Skill might be missing PLUGIN_MAP"
    fi
    checks_total=$((checks_total + 1))
fi

# Check for examples
if [ -f "skills/task-router/README.md" ]; then
    if grep -q "Example" "skills/task-router/README.md"; then
        echo -e "${GREEN}✓${NC} README contains examples"
        checks_passed=$((checks_passed + 1))
    else
        echo -e "${YELLOW}⚠${NC} README might be missing examples"
    fi
    checks_total=$((checks_total + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

percentage=$((checks_passed * 100 / checks_total))

if [ $checks_passed -eq $checks_total ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC} ($checks_passed/$checks_total)"
    echo ""
    echo -e "${GREEN}Task Router is fully installed and ready to use!${NC}"
    echo ""
    echo "Try it now:"
    echo "  /task-router"
    echo ""
elif [ $percentage -ge 80 ]; then
    echo -e "${YELLOW}⚠ MOSTLY COMPLETE${NC} ($checks_passed/$checks_total - $percentage%)"
    echo ""
    echo "Task Router is mostly installed but some files might be missing."
    echo "Review the errors above and check if critical files are present."
    echo ""
else
    echo -e "${RED}✗ INSTALLATION INCOMPLETE${NC} ($checks_passed/$checks_total - $percentage%)"
    echo ""
    echo "Task Router installation appears incomplete."
    echo "Review the errors above and re-run the installation."
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 DOCUMENTATION AVAILABLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  • TASK_ROUTER_GUIDE.md          - Full installation guide"
echo "  • TASK_ROUTER_SUMMARY.md        - Quick overview"
echo "  • skills/task-router/README.md  - How it works"
echo "  • skills/task-router/QUICK_REFERENCE.md - Cheat sheet"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
