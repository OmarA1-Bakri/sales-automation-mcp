#!/usr/bin/env node
/**
 * E2E Test Results Aggregator
 *
 * Collects results from all persona test containers and generates
 * a unified report with statistics and analysis.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const resultsDir = process.env.TEST_RESULTS_DIR || '/app/test-results';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function loadPersonaResults() {
  const results = [];

  for (let i = 1; i <= 5; i++) {
    const personaDir = join(resultsDir, `persona-${i}`);
    const resultsFile = join(personaDir, 'results.json');

    if (existsSync(resultsFile)) {
      try {
        const data = JSON.parse(readFileSync(resultsFile, 'utf-8'));
        results.push({
          personaNumber: i,
          ...data,
        });
      } catch (error) {
        results.push({
          personaNumber: i,
          persona: `Persona ${i}`,
          role: 'Unknown',
          flows: [],
          passedFlows: 0,
          failedFlows: 0,
          totalDuration: 0,
          error: `Failed to parse results: ${error.message}`,
        });
      }
    } else {
      results.push({
        personaNumber: i,
        persona: `Persona ${i}`,
        role: 'Unknown',
        flows: [],
        passedFlows: 0,
        failedFlows: 0,
        totalDuration: 0,
        error: 'Results file not found - test may not have run',
      });
    }
  }

  return results;
}

function generateReport(results) {
  const timestamp = new Date().toISOString();

  // Calculate totals
  const totals = results.reduce(
    (acc, r) => ({
      passedFlows: acc.passedFlows + (r.passedFlows || 0),
      failedFlows: acc.failedFlows + (r.failedFlows || 0),
      totalFlows: acc.totalFlows + (r.flows?.length || 0),
      totalDuration: acc.totalDuration + (r.totalDuration || 0),
      errors: acc.errors + (r.error || r.fatalError ? 1 : 0),
    }),
    { passedFlows: 0, failedFlows: 0, totalFlows: 0, totalDuration: 0, errors: 0 }
  );

  const passRate = totals.totalFlows > 0
    ? ((totals.passedFlows / totals.totalFlows) * 100).toFixed(1)
    : 0;

  const report = {
    timestamp,
    summary: {
      totalPersonas: 5,
      personasCompleted: results.filter(r => !r.error && !r.fatalError).length,
      personasWithErrors: results.filter(r => r.error || r.fatalError).length,
      totalFlows: totals.totalFlows,
      passedFlows: totals.passedFlows,
      failedFlows: totals.failedFlows,
      passRate: `${passRate}%`,
      totalDurationMs: totals.totalDuration,
      totalDurationFormatted: formatDuration(totals.totalDuration),
    },
    personas: results.map(r => ({
      number: r.personaNumber,
      name: r.persona,
      role: r.role,
      status: r.error || r.fatalError ? 'ERROR' : r.failedFlows > 0 ? 'PARTIAL' : 'PASSED',
      passedFlows: r.passedFlows || 0,
      failedFlows: r.failedFlows || 0,
      totalFlows: r.flows?.length || 0,
      durationMs: r.totalDuration || 0,
      durationFormatted: formatDuration(r.totalDuration || 0),
      error: r.error || r.fatalError || null,
      flows: r.flows?.map(f => ({
        name: f.flowName,
        success: f.success,
        duration: f.steps?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
        stepsCompleted: f.steps?.filter(s => s.success).length || 0,
        totalSteps: f.steps?.length || 0,
        error: f.error || null,
      })) || [],
    })),
  };

  return report;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function printReport(report) {
  log('\n' + '═'.repeat(80), colors.bright);
  log('                    E2E TEST RESULTS - ALL PERSONAS', colors.bright + colors.cyan);
  log('═'.repeat(80), colors.bright);

  log(`\nTimestamp: ${report.timestamp}`);
  log('\n📊 SUMMARY', colors.bright);
  log('─'.repeat(40));
  log(`Personas Completed: ${report.summary.personasCompleted}/5`);
  log(`Total Flows: ${report.summary.totalFlows}`);

  const passColor = report.summary.passedFlows === report.summary.totalFlows ? colors.green : colors.yellow;
  log(`Passed: ${report.summary.passedFlows}`, passColor);

  if (report.summary.failedFlows > 0) {
    log(`Failed: ${report.summary.failedFlows}`, colors.red);
  }

  log(`Pass Rate: ${report.summary.passRate}`);
  log(`Total Duration: ${report.summary.totalDurationFormatted}`);

  log('\n📋 PERSONA BREAKDOWN', colors.bright);
  log('─'.repeat(80));

  for (const persona of report.personas) {
    const statusEmoji = persona.status === 'PASSED' ? '✅' : persona.status === 'PARTIAL' ? '⚠️' : '❌';
    const statusColor = persona.status === 'PASSED' ? colors.green : persona.status === 'PARTIAL' ? colors.yellow : colors.red;

    log(`\n${statusEmoji} Persona ${persona.number}: ${persona.name} (${persona.role})`, statusColor);
    log(`   Status: ${persona.status} | Flows: ${persona.passedFlows}/${persona.totalFlows} passed | Duration: ${persona.durationFormatted}`);

    if (persona.error) {
      log(`   Error: ${persona.error}`, colors.red);
    }

    // Show failed flows
    const failedFlows = persona.flows.filter(f => !f.success);
    if (failedFlows.length > 0) {
      log('   Failed Flows:', colors.red);
      for (const flow of failedFlows) {
        log(`      - ${flow.name}: ${flow.error || 'Unknown error'}`, colors.red);
      }
    }
  }

  log('\n' + '═'.repeat(80));

  if (report.summary.failedFlows === 0 && report.summary.personasWithErrors === 0) {
    log('🎉 ALL E2E TESTS PASSED!', colors.green + colors.bright);
  } else {
    log('⚠️  SOME E2E TESTS FAILED - Review individual persona results', colors.yellow + colors.bright);
  }

  log('═'.repeat(80) + '\n');
}

// Main
async function main() {
  log('\n🔄 Aggregating E2E test results...', colors.cyan);

  const results = loadPersonaResults();
  const report = generateReport(results);

  // Save report
  const reportFile = join(resultsDir, 'aggregate-report.json');
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`📄 Report saved to: ${reportFile}`, colors.blue);

  // Print to console
  printReport(report);

  // Exit with appropriate code
  const hasFailures = report.summary.failedFlows > 0 || report.summary.personasWithErrors > 0;
  process.exit(hasFailures ? 1 : 0);
}

main().catch(error => {
  console.error('Aggregation failed:', error);
  process.exit(1);
});
