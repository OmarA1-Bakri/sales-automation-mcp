# Task Router Skill Package

> Intelligent task analysis and plugin recommendation system for Claude Code

**Version**: 1.0.0
**License**: MIT
**Type**: Claude Code Skill

---

## 📦 What's Included

This package contains everything you need to install and use the Task Router skill:

```
task-router-package/
├── .claude/
│   └── commands/
│       └── task-router.md          # Slash command interface
├── skills/
│   └── task-router/
│       ├── skill.md                # Core intelligence engine
│       ├── README.md               # User guide
│       └── QUICK_REFERENCE.md      # Quick reference cheat sheet
├── docs/
│   ├── TASK_ROUTER_GUIDE.md        # Complete installation guide
│   ├── TASK_ROUTER_SUMMARY.md      # Quick overview
│   └── INSTALLATION_COMPLETE.md    # Getting started guide
├── scripts/
│   ├── install.sh                  # Automated installation script
│   ├── uninstall.sh                # Uninstallation script
│   └── verify-task-router.sh       # Verification script (13 checks)
├── package.json                    # Package metadata
└── README.md                       # This file
```

**Total**: 11 files, ~70 KB

---

## 🎯 What is Task Router?

Task Router is an intelligent skill that:

1. **Analyzes** your task description
2. **Recommends** the best plugins from 100+ options
3. **Plans** step-by-step execution workflows
4. **Estimates** time and complexity
5. **Supports** 6 major domains:
   - Sales & CRM (6 plugins)
   - API Development (20+ plugins)
   - DevOps & Infrastructure (25+ plugins)
   - Testing & QA (15+ plugins)
   - AI/ML (25+ plugins)
   - Data & Databases (5+ plugins)

---

## 🚀 Quick Installation

### Automated Installation (Recommended)

```bash
# Extract the package
tar -xzf task-router-v1.0.0.tar.gz
# or
unzip task-router-v1.0.0.zip

# Navigate to package directory
cd task-router-package

# Run installation script
bash scripts/install.sh

# Optional: Specify installation directory
bash scripts/install.sh /path/to/your/project
```

### Manual Installation

1. Extract the package
2. Copy files to your Claude Code project:
   ```bash
   cp -r .claude/* /path/to/project/.claude/
   cp -r skills/* /path/to/project/skills/
   cp -r docs/* /path/to/project/docs/
   cp -r scripts/* /path/to/project/scripts/
   ```
3. Make scripts executable:
   ```bash
   chmod +x /path/to/project/scripts/*.sh
   ```

---

## ✅ Verification

After installation, verify everything is working:

```bash
cd /path/to/project
./scripts/verify-task-router.sh
```

Expected output:
```
✓ ALL CHECKS PASSED (13/13)
Task Router is fully installed and ready to use!
```

---

## 🎓 Usage

### Quick Start

**Method 1: Slash Command**
```bash
/task-router
```

**Method 2: Natural Language**
```
"task router: I need to build a REST API with authentication"
"which plugins should I use to find sales prospects?"
"help me route this task: deploy microservices to Kubernetes"
```

**Method 3: Question Format**
```
"Which plugins for: train a sentiment analysis model?"
"What's the best way to set up a sales funnel?"
```

### Example Tasks

**Simple (Sales)**
```
Task: "Find 50 fintech prospects"

Expected Output:
  Category: sales
  Complexity: Low
  Time: 10-15 minutes
  Workflow:
    1. /sales-discover
    2. Optional: /sales-enrich
```

**Medium (API Development)**
```
Task: "Build REST API with JWT auth and deploy to Docker"

Expected Output:
  Category: api, devops
  Complexity: Medium
  Time: 45-60 minutes
  Workflow:
    Phase 1: API creation
    Phase 2: Security & testing (parallel)
    Phase 3: Deployment
```

**Complex (Machine Learning)**
```
Task: "Train sentiment classifier and deploy as API"

Expected Output:
  Category: ml, api
  Complexity: Very High
  Time: 2-3 hours
  Workflow:
    Phase 1: Data preparation
    Phase 2: Model training
    Phase 3: Evaluation (checkpoint)
    Phase 4: Deployment
```

---

## 📚 Documentation

After installation, refer to:

- **docs/INSTALLATION_COMPLETE.md** - Start here
- **docs/TASK_ROUTER_GUIDE.md** - Complete guide
- **docs/TASK_ROUTER_SUMMARY.md** - Quick reference
- **skills/task-router/README.md** - How it works
- **skills/task-router/QUICK_REFERENCE.md** - Cheat sheet

---

## 🔧 Requirements

### Minimum Requirements
- Claude Code v1.0.0 or higher
- Bash shell (for installation scripts)
- At least 1 MB of available disk space

### Recommended
- 10+ Claude Code plugins installed (for better recommendations)
- Familiarity with your installed plugins

---

## 🗑️ Uninstallation

To remove Task Router:

```bash
cd /path/to/project
./scripts/uninstall.sh

# Or specify directory
./scripts/uninstall.sh /path/to/project
```

This will remove:
- Slash command
- Skill files
- Documentation
- Verification script
- Uninstall script itself

---

## 🔄 Updating

To update Task Router to a new version:

1. Uninstall the current version:
   ```bash
   ./scripts/uninstall.sh
   ```

2. Install the new version:
   ```bash
   bash new-package/scripts/install.sh
   ```

---

## 🤝 Customization

### Add New Plugins

Edit `skills/task-router/skill.md`:

```javascript
const PLUGIN_MAP = {
  your_category: {
    your_subcategory: ['your-new-plugin']
  }
};
```

### Update Keywords

Add domain-specific keywords for better classification:

```javascript
const categories = {
  your_domain: ['keyword1', 'keyword2', 'keyword3']
};
```

---

## 📋 Package Metadata

```json
{
  "name": "task-router-skill",
  "version": "1.0.0",
  "type": "claude-skill",
  "coverage": {
    "domains": 6,
    "plugins": "100+",
    "execution_strategies": 4
  }
}
```

---

## 🐛 Troubleshooting

### Installation fails

**Problem**: Permission denied
```bash
# Fix: Make installation script executable
chmod +x scripts/install.sh
bash scripts/install.sh
```

**Problem**: Files already exist
```
# Fix: Uninstall first, then reinstall
./scripts/uninstall.sh
bash scripts/install.sh
```

### Verification fails

**Problem**: Some checks fail
```bash
# Check which files are missing
./scripts/verify-task-router.sh

# Reinstall
bash scripts/install.sh
```

### Task Router not working

**Problem**: `/task-router` command not found
```
# Check if slash command file exists
ls -la .claude/commands/task-router.md

# If missing, reinstall
bash scripts/install.sh
```

---

## 📜 License

MIT License

Copyright (c) 2025 Claude Code Community

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🌟 Features

### Intelligent Analysis
✅ Context-aware task classification
✅ Smart plugin matching
✅ Optimal workflow planning
✅ Complexity estimation

### Comprehensive Coverage
✅ 100+ plugins mapped
✅ 6 major domains
✅ Multiple execution strategies
✅ Real-world examples

### Well-Documented
✅ 70KB of documentation
✅ Multiple guides and references
✅ Step-by-step examples
✅ Quick reference cheat sheets

### Easy to Install
✅ Automated installation script
✅ Verification script (13 checks)
✅ Clean uninstallation
✅ Manual installation option

---

## 📞 Support

### Getting Help

1. Read the documentation in `docs/`
2. Check `QUICK_REFERENCE.md` for common tasks
3. Review examples in `README.md`
4. Run verification: `./scripts/verify-task-router.sh`

### Reporting Issues

Please provide:
- Task Router version (1.0.0)
- Installation method used
- Output of verification script
- Description of the issue

---

## 🎉 Quick Start Checklist

After installation:

- [ ] Run `./scripts/verify-task-router.sh` (should pass 13/13 checks)
- [ ] Read `docs/INSTALLATION_COMPLETE.md`
- [ ] Try `/task-router` with a simple task
- [ ] Bookmark `skills/task-router/QUICK_REFERENCE.md`
- [ ] Customize plugin mappings (optional)

---

## 📊 Package Stats

- **Files**: 11
- **Size**: ~70 KB
- **Domains Covered**: 6
- **Plugins Mapped**: 100+
- **Documentation Pages**: 5
- **Execution Strategies**: 4
- **Verification Checks**: 13

---

**Ready to install?** Run `bash scripts/install.sh`

**Questions?** Read `docs/TASK_ROUTER_GUIDE.md`

**Need help?** Check `skills/task-router/QUICK_REFERENCE.md`

---

*Package created: 2025-11-07*
*Version: 1.0.0*
*Type: Claude Code Skill*
