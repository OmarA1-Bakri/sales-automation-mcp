# ROOT DIRECTORY REMEDIATION PLAN
## Sales Automation Platform - Directory Structure Cleanup

**Generated:** 2025-11-11
**Status:** Analysis Complete - Ready for Execution
**Risk Level:** LOW (No git history, isolated file moves)

---

## CURRENT STATE ANALYSIS

### Root Directory File Count
- **Total Files in Root:** 35 files
- **Documentation Files:** 22 files (❌ Should be in /docs)
- **Scripts:** 4 files (❌ Should be in /scripts)
- **Images:** 1 file (❌ Should be in /assets or /docs/images)
- **Config Files:** 8 files (✅ Acceptable in root)

### Critical Findings

**🔴 BLOCKER: .env file in version control**
- **File:** `.env`
- **Risk:** Contains secrets that should NEVER be committed
- **Status:** Currently in .gitignore (good), but NOT A GIT REPO
- **Action:** Keep .gitignore entry, document for future git init

**⚠️ ROOT CLUTTER: 22 documentation files**
Files that should move to `/docs/reports` or `/docs/archive`:
1. `CHANGELOG.md` - ✅ Keep in root (standard practice)
2. `ENTERPRISE-GRADE-AUTONOMOUS-REMED.md` - Move to /docs/operations
3. `GAP-ANALYSIS-AND-REMEDIATION.md` - Move to /docs/reports
4. `HANDOVER-PHASE-6B.md` - Move to /docs/archive/handovers
5. `HANDOVER-PHASE2-PRODUCTION-READINESS.md` - Move to /docs/archive/handovers
6. `MULTI-PROVIDER-SUMMARY.md` - Move to /docs/reports
7. `PHASE-6A-COMPLETE.md` - Move to /docs/archive/phases
8. `PHASE-6A-FIXES.md` - Move to /docs/archive/phases
9. `PHASE-6B-API-TESTING-GUIDE.md` - Move to /docs/archive/phases
10. `PHASE-6B-BLOCKER-FIXES-COMPLETE.md` - Move to /docs/archive/phases
11. `PHASE-6B-BLOCKER-FIXES-PLAN.md` - Move to /docs/archive/phases
12. `PHASE-6B-CRITICAL-FIXES.md` - Move to /docs/archive/phases
13. `PHASE-6B-PROGRESS.md` - Move to /docs/archive/phases
14. `PHASE-7C-COMPLETE.md` - Move to /docs/archive/phases
15. `PLAN.md` - Move to /docs/planning
16. `README.md` - ✅ Keep in root (standard practice)
17. `ROADMAP.md` - ✅ Keep in root (standard practice) OR move to /docs
18. `VERIFICATION-RESULTS.md` - Move to /docs/reports
19. `VERIFICATION-SUMMARY.md` - Move to /docs/reports
20. `WORK-CRITIC-IMPLEMENTATION-SUMMARY.md` - Move to /docs/reports/work-critic
21. `WORK-CRITIC-MASTER-SUMMARY.md` - Move to /docs/reports/work-critic
22. `WORK-CRITIC-REPORT-API-SERVER.md` - Move to /docs/reports/work-critic
23. `WORK-CRITIC-REPORT-DATABASE.md` - Move to /docs/reports/work-critic
24. `WORK-CRITIC-REPORT-DESKTOP-APP.md` - Move to /docs/reports/work-critic
25. `WORK-CRITIC-REPORT-INTEGRATIONS.md` - Move to /docs/reports/work-critic
26. `WORK-CRITIC-REPORT-PHASE2.md` - Move to /docs/reports/work-critic
27. `WORK-CRITIC-REPORT-TESTING.md` - Move to /docs/reports/work-critic
28. `WORK-CRITIC-REPORT-WORKERS.md` - Move to /docs/reports/work-critic

**⚠️ SCRIPTS IN ROOT: 4 shell scripts**
Files that should move to `/scripts`:
1. `install.sh` - Move to /scripts
2. `rtgs-sales-automation.sh` - Move to /scripts
3. `start-postgres.sh` - Move to /scripts
4. `stop.sh` - Move to /scripts

**⚠️ MEDIA IN ROOT: 1 image file**
Files that should move to `/docs/images` or `/assets`:
1. `RTGSagenticLogo.png` - Move to /docs/images

---

## TARGET DIRECTORY STRUCTURE

```
/
├── .archive/                    # ✅ Keep (historical artifacts)
├── .claude/                     # ✅ Keep (Claude Code config)
├── .claude-plugin/              # ✅ Keep (plugin config)
├── .gitignore                   # ✅ Keep (version control)
├── .sales-automation/           # ⚠️ INVESTIGATE (purpose unclear)
├── .serena/                     # ✅ Keep (Serena MCP cache/memories)
├── .sugar/                      # ✅ Keep (Sugar automation)
├── .env                         # 🔴 NOT IN GIT (secrets)
├── .env.example                 # ✅ Keep (example config)
├── CHANGELOG.md                 # ✅ Keep (root standard)
├── Dockerfile                   # ✅ Keep (container config)
├── docker-compose.yml           # ✅ Keep (orchestration)
├── package.json                 # ✅ Keep (root manifest)
├── package-lock.json            # ✅ Keep (dependency lock)
├── README.md                    # ✅ Keep (root standard)
├── ROADMAP.md                   # ✅ Keep (root standard)
│
├── agents/                      # ⚠️ INVESTIGATE (vs mcp-server/agents)
├── commands/                    # ⚠️ INVESTIGATE (purpose unclear)
├── config/                      # ✅ Keep (configuration files)
├── desktop-app/                 # ✅ Keep (React/Electron app)
├── docs/                        # ✅ Expand with subdirectories
│   ├── api-reference/           # ✅ Keep
│   ├── archive/                 # ✅ Expand
│   │   ├── handovers/           # ➕ CREATE (for HANDOVER-*.md files)
│   │   └── phases/              # ➕ CREATE (for PHASE-*.md files)
│   ├── development/             # ✅ Keep
│   ├── images/                  # ➕ CREATE (for RTGSagenticLogo.png)
│   ├── operations/              # ➕ CREATE (for ENTERPRISE-GRADE-*.md)
│   ├── planning/                # ➕ CREATE (for PLAN.md)
│   ├── reports/                 # ➕ CREATE
│   │   └── work-critic/         # ➕ CREATE (for WORK-CRITIC-*.md files)
│   ├── technical/               # ✅ Keep
│   └── user-guides/             # ✅ Keep
│
├── hooks/                       # ✅ Keep (git/automation hooks)
├── logs/                        # ⚠️ Should be in .gitignore (runtime only)
├── mcp-server/                  # ✅ Keep (Express API server)
├── node_modules/                # ✅ Keep (.gitignored)
├── scripts/                     # ➕ CREATE (for .sh files)
│   ├── install.sh               # ⬅️ MOVE FROM ROOT
│   ├── rtgs-sales-automation.sh # ⬅️ MOVE FROM ROOT
│   ├── start-postgres.sh        # ⬅️ MOVE FROM ROOT
│   └── stop.sh                  # ⬅️ MOVE FROM ROOT
│
├── skills/                      # ⚠️ INVESTIGATE (vs task-router-package)
├── task-router-package/         # ⚠️ INVESTIGATE (should be npm package?)
├── templates/                   # ✅ Keep
└── tests/                       # ⚠️ INVESTIGATE (vs mcp-server/tests)
```

---

## REMEDIATION TASKS

### TASK 1: Create New Directories
**Effort:** 5 minutes | **Risk:** ZERO

```bash
mkdir -p docs/archive/handovers
mkdir -p docs/archive/phases
mkdir -p docs/images
mkdir -p docs/operations
mkdir -p docs/planning
mkdir -p docs/reports/work-critic
mkdir -p scripts
```

**Success Criteria:**
- ✅ All 7 new directories created
- ✅ No errors during mkdir

---

### TASK 2: Move Documentation Files (22 files)
**Effort:** 10 minutes | **Risk:** LOW (simple file moves)

**Handover Files → /docs/archive/handovers (2 files):**
```bash
mv ./HANDOVER-PHASE-6B.md ./docs/archive/handovers/
mv ./HANDOVER-PHASE2-PRODUCTION-READINESS.md ./docs/archive/handovers/
```

**Phase Files → /docs/archive/phases (8 files):**
```bash
mv ./PHASE-6A-COMPLETE.md ./docs/archive/phases/
mv ./PHASE-6A-FIXES.md ./docs/archive/phases/
mv ./PHASE-6B-API-TESTING-GUIDE.md ./docs/archive/phases/
mv ./PHASE-6B-BLOCKER-FIXES-COMPLETE.md ./docs/archive/phases/
mv ./PHASE-6B-BLOCKER-FIXES-PLAN.md ./docs/archive/phases/
mv ./PHASE-6B-CRITICAL-FIXES.md ./docs/archive/phases/
mv ./PHASE-6B-PROGRESS.md ./docs/archive/phases/
mv ./PHASE-7C-COMPLETE.md ./docs/archive/phases/
```

**Work-Critic Reports → /docs/reports/work-critic (8 files):**
```bash
mv ./WORK-CRITIC-IMPLEMENTATION-SUMMARY.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-MASTER-SUMMARY.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-API-SERVER.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-DATABASE.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-DESKTOP-APP.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-INTEGRATIONS.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-PHASE2.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-TESTING.md ./docs/reports/work-critic/
mv ./WORK-CRITIC-REPORT-WORKERS.md ./docs/reports/work-critic/
```

**Other Reports → /docs/reports (3 files):**
```bash
mv ./GAP-ANALYSIS-AND-REMEDIATION.md ./docs/reports/
mv ./MULTI-PROVIDER-SUMMARY.md ./docs/reports/
mv ./VERIFICATION-RESULTS.md ./docs/reports/
mv ./VERIFICATION-SUMMARY.md ./docs/reports/
```

**Operations Docs → /docs/operations (1 file):**
```bash
mv ./ENTERPRISE-GRADE-AUTONOMOUS-REMED.md ./docs/operations/
```

**Planning Docs → /docs/planning (1 file):**
```bash
mv ./PLAN.md ./docs/planning/
```

**Success Criteria:**
- ✅ All 22 documentation files moved
- ✅ Root directory has only 3 MD files (CHANGELOG.md, README.md, ROADMAP.md)
- ✅ No broken links (verify in TASK 4)

---

### TASK 3: Move Scripts (4 files)
**Effort:** 5 minutes | **Risk:** LOW

```bash
mv ./install.sh ./scripts/
mv ./rtgs-sales-automation.sh ./scripts/
mv ./start-postgres.sh ./scripts/
mv ./stop.sh ./scripts/

# Ensure all scripts are executable
chmod +x ./scripts/*.sh
```

**Success Criteria:**
- ✅ All 4 scripts moved to /scripts
- ✅ All scripts remain executable (chmod +x)
- ✅ No references to old paths in code (verify in TASK 4)

---

### TASK 4: Move Image File (1 file)
**Effort:** 2 minutes | **Risk:** ZERO

```bash
mv ./RTGSagenticLogo.png ./docs/images/
```

**Success Criteria:**
- ✅ Image moved to /docs/images
- ✅ No references to old path in code (verify in TASK 4)

---

### TASK 5: Scan for References and Update
**Effort:** 30-60 minutes | **Risk:** MEDIUM (requires careful search/replace)

**Step 5.1: Scan for script references**
```bash
# Search for references to moved scripts
grep -r "install.sh" --include="*.js" --include="*.md" --include="*.json" . 2>/dev/null
grep -r "rtgs-sales-automation.sh" --include="*.js" --include="*.md" --include="*.json" . 2>/dev/null
grep -r "start-postgres.sh" --include="*.js" --include="*.md" --include="*.json" . 2>/dev/null
grep -r "stop.sh" --include="*.js" --include="*.md" --include="*.json" . 2>/dev/null
```

**Step 5.2: Scan for image references**
```bash
grep -r "RTGSagenticLogo.png" --include="*.js" --include="*.jsx" --include="*.md" --include="*.html" . 2>/dev/null
```

**Step 5.3: Scan for documentation file references**
```bash
# Search for links to moved docs (sample)
grep -r "HANDOVER-PHASE" --include="*.md" . 2>/dev/null
grep -r "WORK-CRITIC-REPORT" --include="*.md" . 2>/dev/null
grep -r "VERIFICATION-" --include="*.md" . 2>/dev/null
```

**Step 5.4: Update references**
- For each found reference, update the path to new location
- Use search/replace with exact paths
- Example: `./install.sh` → `./scripts/install.sh`

**Success Criteria:**
- ✅ All references scanned and documented
- ✅ All references updated to new paths
- ✅ No broken links in documentation
- ✅ No broken file paths in code

---

### TASK 6: Validate File System Integrity
**Effort:** 10 minutes | **Risk:** ZERO (read-only validation)

```bash
# Verify all files moved successfully
test -f ./docs/archive/handovers/HANDOVER-PHASE-6B.md && echo "✅ Handovers moved"
test -f ./docs/archive/phases/PHASE-6A-COMPLETE.md && echo "✅ Phases moved"
test -f ./docs/reports/work-critic/WORK-CRITIC-MASTER-SUMMARY.md && echo "✅ Work-critic moved"
test -f ./scripts/install.sh && echo "✅ Scripts moved"
test -f ./docs/images/RTGSagenticLogo.png && echo "✅ Image moved"

# Verify old files no longer in root
! test -f ./HANDOVER-PHASE-6B.md && echo "✅ Root cleanup confirmed"
! test -f ./install.sh && echo "✅ Scripts removed from root"

# Count files in root (should be ~13 files)
ls -1 | wc -l
```

**Success Criteria:**
- ✅ All moved files exist in new locations
- ✅ No moved files remain in root
- ✅ Root directory has ≤15 files

---

### TASK 7: Update Documentation Index
**Effort:** 15 minutes | **Risk:** LOW

**Create /docs/INDEX.md:**
```markdown
# Documentation Index

## Root Documentation
- [README.md](../README.md) - Project overview
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [ROADMAP.md](../ROADMAP.md) - Future plans

## Reports
- [Work-Critic Reports](./reports/work-critic/)
- [Verification Reports](./reports/)

## Archive
- [Handovers](./archive/handovers/)
- [Phase Completion Reports](./archive/phases/)

## Operations
- [Enterprise-Grade Autonomous Remediation](./operations/ENTERPRISE-GRADE-AUTONOMOUS-REMED.md)

## Planning
- [Project Plan](./planning/PLAN.md)
```

**Success Criteria:**
- ✅ INDEX.md created in /docs
- ✅ All major documentation categories listed
- ✅ Links verified (no 404s)

---

## RISK ASSESSMENT

### Low Risk Operations (90% of tasks)
- Creating new directories
- Moving documentation files
- Moving image files
- Validation tasks

### Medium Risk Operations (10% of tasks)
- Moving scripts (if referenced in package.json or other configs)
- Updating file references in code

### Mitigation Strategies
1. **Before moving scripts:** Search all package.json files for script references
2. **Before moving files:** Create backup with `tar -czf backup-$(date +%F).tar.gz .`
3. **After moving files:** Run comprehensive search for broken references
4. **Rollback plan:** Keep backup tarball for 7 days

---

## IMPACT ANALYSIS

### Files That Will NOT Be Modified
- ✅ All source code (.js, .jsx, .ts, .tsx)
- ✅ All configuration files (package.json, .env.example, etc.)
- ✅ All dependencies (node_modules)
- ✅ All data files

### Files That WILL Be Modified
- Documentation files (only location changes, no content edits)
- Scripts (only location changes, no content edits)
- Images (only location changes, no content edits)
- Potentially: References to moved files in other documents

### Breaking Change Risk
**ZERO** - This is purely organizational cleanup. No code functionality changes.

---

## EXECUTION SEQUENCE

1. ✅ **TASK 1:** Create new directories (5 min)
2. ✅ **TASK 5:** Scan for references FIRST (30 min) - Know what to update before moving
3. ✅ **TASK 2:** Move documentation files (10 min)
4. ✅ **TASK 3:** Move scripts (5 min)
5. ✅ **TASK 4:** Move image (2 min)
6. ✅ **TASK 5 (continued):** Update references (30 min)
7. ✅ **TASK 6:** Validate integrity (10 min)
8. ✅ **TASK 7:** Update documentation index (15 min)

**Total Estimated Time:** 1.5-2 hours

---

## SUCCESS CRITERIA - PHASE 1 COMPLETE

### Directory Structure
- ✅ Root directory has ≤15 files (down from 35)
- ✅ All documentation organized in /docs subdirectories
- ✅ All scripts in /scripts directory
- ✅ All images in /docs/images
- ✅ Clear, enterprise-standard structure

### File Integrity
- ✅ Zero files lost or corrupted
- ✅ All moved files accessible at new locations
- ✅ File permissions preserved (especially scripts)

### Reference Integrity
- ✅ Zero broken file references in code
- ✅ Zero broken links in documentation
- ✅ All imports/requires still functional

### Validation
- ✅ File count verification passed
- ✅ Reference scan shows zero broken links
- ✅ Documentation index created and accurate

### Testing
- ✅ Project still builds: `cd desktop-app && npm run build` (if applicable)
- ✅ API server still starts: `cd mcp-server && npm start` (if applicable)
- ✅ No import errors in console

---

## NOTES

1. **NOT A GIT REPOSITORY:** This directory is not under version control. If git is initialized in the future, ensure `.env` is in `.gitignore` BEFORE first commit.

2. **Hidden Directories (.claude, .sugar, .serena):** These are tool-specific and should remain in place. They are not clutter.

3. **Duplicate Directories Investigation:** After Phase 1, investigate:
   - `./agents` vs `./mcp-server/agents` (which is canonical?)
   - `./tests` vs `./mcp-server/tests` vs `./mcp-server/test` (consolidate?)

4. **ROADMAP.md Location:** Standard practice allows ROADMAP.md in root OR in /docs. Recommend keeping in root for visibility.

---

**STATUS:** ✅ Plan Complete - Ready for Autonomous Execution
**NEXT:** Execute TASK 1-7 sequentially with validation loops
