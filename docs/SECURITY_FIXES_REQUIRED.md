# IMMEDIATE SECURITY FIXES REQUIRED

## CRITICAL - Fix Within 24 Hours

### 🔴 CRITICAL-01: Path Traversal in KnowledgeService.js
**File**: `/home/omar/claude - sales_auto_skill/sales-automation-api/src/services/KnowledgeService.js`
**Line**: 46-58

**Problem**: Attackers can read ANY file on the server including .env files with secrets

**Attack Example**:
```javascript
KnowledgeService.loadKnowledgeFile('../../etc', 'passwd');
// Reads /etc/passwd
```

**Fix Required**:
```javascript
// Add BEFORE line 55
const ALLOWED_CATEGORIES = ['company', 'competitive', 'industry', 'learnings'];

if (!ALLOWED_CATEGORIES.includes(category)) {
  throw new Error('Invalid knowledge category');
}

const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '');
if (sanitizedFilename !== filename || category.includes('..') || category.includes('/')) {
  throw new Error('Invalid filename or category');
}

const filePath = path.join(KNOWLEDGE_DIR, category, `${sanitizedFilename}.md`);

// Add path verification AFTER line 55
const resolvedPath = path.resolve(filePath);
const resolvedKnowledgeDir = path.resolve(KNOWLEDGE_DIR);
if (!resolvedPath.startsWith(resolvedKnowledgeDir)) {
  throw new Error('Invalid file path');
}
```

---

## HIGH - Fix Within 1 Week

### 🟠 HIGH-01: SQL Injection in OutreachOutcome.cjs
**File**: `/home/omar/claude - sales_auto_skill/sales-automation-api/src/models/OutreachOutcome.cjs`
**Lines**: 215, 249, 278

**Problem**: `minSamples` parameter not validated before SQL interpolation

**Fix Required**:
```javascript
// Add at START of each function (getTemplatePerformance, getBestTemplateByPersona, getSubjectLinePerformance)
const validatedMinSamples = parseInt(minSamples, 10);
if (isNaN(validatedMinSamples) || validatedMinSamples < 0 || validatedMinSamples > 10000) {
  throw new Error('Invalid minSamples parameter');
}

// Replace ALL occurrences of ${minSamples} with:
${validatedMinSamples}
```

---

### 🟠 HIGH-02: Markdown Injection in OutcomeTracker.js
**File**: `/home/omar/claude - sales_auto_skill/sales-automation-api/src/services/OutcomeTracker.js`
**Lines**: 345, 408, 438, 487

**Problem**: User content inserted into markdown files without sanitization

**Fix Required**:
```javascript
// Add helper method at end of class:
static sanitizeMarkdown(markdown) {
  return markdown
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\((javascript|data):[^\)]*\)/gi, '[$1](#)');
}

// Update truncateText method (line 494):
static truncateText(text, maxLength) {
  if (!text) return '*empty*';
  const sanitized = text.replace(/[*_~`#\[\]()]/g, '').trim();
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.substring(0, maxLength - 3) + '...';
}

// Add size limit in updateWhatWorks and updateWhatDoesntWork:
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
if (content.length > MAX_FILE_SIZE) {
  throw new Error('Generated content too large');
}
```

---

### 🟠 HIGH-03: DoS via DNS Lookups in DataQualityService.js
**File**: `/home/omar/claude - sales_auto_skill/sales-automation-api/src/services/DataQualityService.js`
**Lines**: 402-419

**Problem**: Batch validation can trigger thousands of DNS lookups

**Fix Required**:
```javascript
// At start of validateBatch method (line 402):
const MAX_BATCH_SIZE = 100;
if (contacts.length > MAX_BATCH_SIZE) {
  throw new Error(`Batch size exceeds limit of ${MAX_BATCH_SIZE}`);
}

// Replace the for loop (line 419) with:
const CONCURRENCY = 5;
for (let i = 0; i < contacts.length; i += CONCURRENCY) {
  const batch = contacts.slice(i, i + CONCURRENCY);
  const validations = await Promise.all(
    batch.map(contact => this.validateContact(contact))
  );

  for (const validation of validations) {
    results.validations.push(validation);
    if (validation.recommendation === 'allow') results.allowed++;
    else if (validation.recommendation === 'warn') results.warned++;
    else results.blocked++;

    const grade = validation.completeness.grade;
    if (results.quality_distribution[grade] !== undefined) {
      results.quality_distribution[grade]++;
    }

    for (const reason of validation.block_reasons) {
      results.block_reason_summary[reason] =
        (results.block_reason_summary[reason] || 0) + 1;
    }
  }
}

// Add cache size limit in checkMXRecords method (line 207):
const MAX_CACHE_SIZE = 10000;
if (mxCache.size >= MAX_CACHE_SIZE) {
  const entries = Array.from(mxCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.25));
  toDelete.forEach(([key]) => mxCache.delete(key));
}
```

---

## MEDIUM - Fix Within 2 Weeks

### 🟡 MEDIUM-01: ReDoS in KnowledgeService.js (Line 321)
```javascript
// Escape regex metacharacters
const escapedMatch = bestMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`## \\d+\\. ${escapedMatch}.*?(?=## \\d+\\. |---|\$)`, 's');
```

### 🟡 MEDIUM-02: Missing Validation in InsightsGenerator.js (Line 37)
```javascript
const validatedDays = parseInt(days, 10);
if (isNaN(validatedDays) || validatedDays < 1 || validatedDays > 365) {
  throw new Error('Invalid days parameter: must be between 1 and 365');
}
```

---

## Testing Checklist

After applying fixes, test:

- [ ] Path traversal attack: `GET /api/knowledge/../../etc/passwd`
- [ ] SQL injection: `GET /api/outcomes/performance?minSamples=1);DROP TABLE users;--`
- [ ] DoS attack: `POST /api/contacts/validate` with 1000+ contacts
- [ ] Markdown injection: Create outcome with subject `[XSS](javascript:alert(1))`
- [ ] Verify all tests still pass
- [ ] Check logs for error messages

---

## Files to Patch

1. `sales-automation-api/src/services/KnowledgeService.js` - CRITICAL
2. `sales-automation-api/src/models/OutreachOutcome.cjs` - HIGH
3. `sales-automation-api/src/services/OutcomeTracker.js` - HIGH
4. `sales-automation-api/src/services/DataQualityService.js` - HIGH
5. `sales-automation-api/src/services/InsightsGenerator.js` - MEDIUM

---

## Deployment Plan

1. **Stage 1 (Emergency)**: Deploy CRITICAL-01 fix to production immediately
2. **Stage 2 (Week 1)**: Deploy HIGH-01, HIGH-02, HIGH-03 together after testing
3. **Stage 3 (Week 2)**: Deploy MEDIUM severity fixes
4. **Stage 4 (Week 4)**: Deploy LOW severity enhancements

---

See `BACKEND_SECURITY_AUDIT_REPORT.md` for full details and remediation code.
