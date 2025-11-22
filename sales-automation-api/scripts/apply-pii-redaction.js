#!/usr/bin/env node
/**
 * SECURITY FIX: Phase 2, T2.4 - Apply PII Redaction to All Error Handlers
 *
 * This script automatically updates workers and clients to use secure logger
 * with PII redaction instead of console.log/error/warn.
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'mcp-server/src/workers/crm-sync-worker.js',
  'mcp-server/src/workers/import-worker.js',
  'mcp-server/src/workers/lead-discovery-worker.js',
  'mcp-server/src/workers/outreach-worker.js',
  'mcp-server/src/clients/lemlist-client.js',
  'mcp-server/src/middleware/campaign-error-handler.js',
  'mcp-server/src/middleware/validate.js',
];

function updateFile(filePath) {
  const fullPath = path.join('/home/omar/claude - sales_auto_skill', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  Skipping ${filePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Step 1: Add logger import if not present
  if (!content.includes('createLogger')) {
    // Find the last import statement
    const importMatch = content.match(/^import .* from .*;$/m);
    if (importMatch) {
      const lastImport = importMatch[0];
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      content = content.slice(0, insertPos) +
                "\nimport { createLogger } from '../utils/logger.js';" +
                content.slice(insertPos);
      modified = true;
    }
  }

  // Step 2: Add logger to constructor if not present
  if (!content.includes('this.logger =') && content.includes('constructor')) {
    // Find constructor closing brace (simple heuristic)
    const constructorMatch = content.match(/constructor\([^)]*\)\s*\{/);
    if (constructorMatch) {
      const constructorStart = content.indexOf(constructorMatch[0]);
      const constructorBodyStart = constructorStart + constructorMatch[0].length;

      // Insert logger initialization
      const loggerInit = `\n    // SECURITY FIX: Phase 2, T2.4 - Use secure logger with PII redaction\n    this.logger = createLogger('${path.basename(filePath, '.js')}');\n`;

      // Find first statement in constructor
      const firstStatementMatch = content.slice(constructorBodyStart).match(/\n\s{4}[a-z]/);
      if (firstStatementMatch) {
        const insertPos = constructorBodyStart + content.slice(constructorBodyStart).indexOf(firstStatementMatch[0]);
        content = content.slice(0, insertPos) + loggerInit + content.slice(insertPos);
        modified = true;
      }
    }
  }

  // Step 3: Replace console.log/error/warn with this.logger calls
  const consoleReplacements = [
    // console.log -> this.logger.info
    {
      pattern: /console\.log\(\s*[`'"](\[[\w\s]+\])\s*(.+?)[`'"]([,)])/g,
      replace: (match, component, message, ending) => {
        return `this.logger.info('${message.trim()}'${ending}`;
      }
    },
    {
      pattern: /console\.log\(\s*[`'"](.+?)[`'"]\s*,\s*(.+?)\)/g,
      replace: (match, message, data) => {
        return `this.logger.info('${message.replace(/\[[\w\s]+\]\s*/, '')}', ${data})`;
      }
    },
    // console.error -> this.logger.error
    {
      pattern: /console\.error\(\s*[`'"](\[[\w\s]+\])\s*(.+?)[`'"]([,)])/g,
      replace: (match, component, message, ending) => {
        return `this.logger.error('${message.trim()}'${ending}`;
      }
    },
    {
      pattern: /console\.error\(\s*[`'"](.+?)[`'"]\s*,\s*(.+?)\)/g,
      replace: (match, message, data) => {
        return `this.logger.error('${message.replace(/\[[\w\s]+\]\s*/, '')}', ${data})`;
      }
    },
    // console.warn -> this.logger.warn
    {
      pattern: /console\.warn\(\s*[`'"](\[[\w\s]+\])\s*(.+?)[`'"]([,)])/g,
      replace: (match, component, message, ending) => {
        return `this.logger.warn('${message.trim()}'${ending}`;
      }
    },
    {
      pattern: /console\.warn\(\s*[`'"](.+?)[`'"]\s*,\s*(.+?)\)/g,
      replace: (match, message, data) => {
        return `this.logger.warn('${message.replace(/\[[\w\s]+\]\s*/, '')}', ${data})`;
      }
    },
  ];

  for (const { pattern, replace } of consoleReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replace);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed for ${filePath}`);
    return false;
  }
}

// Main execution
console.log('🔒 SECURITY FIX: Applying PII Redaction to Error Handlers\n');

let updatedCount = 0;
for (const file of filesToUpdate) {
  if (updateFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✅ Complete: Updated ${updatedCount}/${filesToUpdate.length} files`);
console.log('🔒 PII redaction now active in all error handlers');
