# Autonomous Remediation Workflow - Critical Guidelines

**Last Updated:** 2025-11-12
**Status:** ACTIVE - Follow strictly for all autonomous work

---

## Quality Standards

### Minimum Acceptable Grade: 85-90/100
- **ALL implementations must achieve 85-90/100 minimum**
- No exceptions - this is the new permanent quality bar
- Previous 75/100 grade is NOT acceptable for production

---

## Execution Workflow

### 7-Phase Remediation Plan (Original)
Must complete in order:
1. **Phase 1:** ✅ PII Redaction (100% complete)
2. **Phase 2:** Security Fixes (40% complete - 4/10 tasks)
3. **Phase 3:** Data Integrity & Blocking Issues (66% complete - 4/6 tasks)
4. **Phase 4:** Critical Issues (40 remaining issues)
5. **Phase 5:** Test Coverage & CI/CD
6. **Phase 6:** Performance & Monitoring
7. **Phase 7:** Final Validation & Documentation

### CRITICAL: Work-Critic After Every Phase
**This is mandatory and saves significant rework:**
- ✅ Run work-critic immediately after completing each phase
- ✅ Validate quality scores meet 85-90/100 minimum
- ✅ Address any issues BEFORE moving to next phase
- ✅ Document work-critic results in phase completion report

**DO NOT proceed to next phase until work-critic validates current phase meets quality standards.**

---

## Tool Usage Requirements

### Task-Router for All Tasks
- **Use /task-router BEFORE implementing any task**
- Get specialist plugin/skill recommendations
- Follow best practices from domain experts
- Ensures optimal execution strategy

### Example Workflow:
```
1. Identify next task (e.g., P3.4: Encrypt localStorage)
2. Run /task-router with task description
3. Review plugin recommendations
4. Execute task using recommended plugins
5. Document results
6. Run work-critic upon phase completion
7. Address any quality gaps
8. Move to next phase only after validation
```

---

## Autonomous Execution

- Continue autonomous implementation without human intervention
- Use specialized agents/plugins for each domain
- Maintain comprehensive documentation
- Create handoff documents after each session

---

## Deferred Work

The **Grade Acceleration Plan** (75→90 across all categories) is deferred until:
1. All 7 phases of original remediation are complete
2. Work-critic validates each phase
3. Overall system meets 85-90/100 minimum
4. Reassessment determines if additional work needed

---

## Memory Location

This workflow is stored in:
- **Serena Memory:** `autonomous-remediation-workflow.md`
- **Session Context:** Active working memory
- **Documentation:** Referenced in all phase reports

---

**CRITICAL REMINDER:**
✅ Work-critic after EVERY phase
✅ 85-90/100 minimum for ALL work
✅ Task-router before implementing tasks
✅ Autonomous execution with quality validation
