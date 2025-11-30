/**
 * Outcome Tracker Service
 * Tracks outreach outcomes and updates the AI learning files
 *
 * Responsibilities:
 * - Record outcome events (opens, clicks, replies, meetings)
 * - Link outcomes to templates and personas
 * - Analyze patterns and update learnings files
 * - Generate weekly performance digests
 */

import { createLogger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import { AnalyticsCacheService } from './AnalyticsCacheService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = createLogger('OutcomeTracker');

// Get paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'knowledge');
const LEARNINGS_DIR = path.join(KNOWLEDGE_DIR, 'learnings');

// Lazy-load model
let OutreachOutcome;

async function getOutcomeModel() {
  if (!OutreachOutcome) {
    const models = await import('../models/index.js');
    OutreachOutcome = models.OutreachOutcome;
  }
  return OutreachOutcome;
}

export class OutcomeTracker {
  /**
   * Record a new outreach send
   *
   * @param {Object} data - Outreach data
   * @returns {Promise<Object>} Created outcome record
   */
  static async recordSend(data) {
    const Outcome = await getOutcomeModel();

    try {
      const outcome = await Outcome.create({
        enrollment_id: data.enrollment_id,
        template_used: data.template_used,
        subject_line: data.subject_line,
        persona: data.persona,
        industry: data.industry,
        company_size: data.company_size,
        region: data.region,
        channel: data.channel || 'email',
        sent_at: data.sent_at || new Date(),
        personalization_used: data.personalization_used || [],
        quality_score: data.quality_score
      });

      logger.debug('Recorded outreach send', {
        id: outcome.id,
        template: data.template_used,
        persona: data.persona
      });

      return outcome;
    } catch (error) {
      logger.error('Failed to record send', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Record an open event
   *
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Updated outcome
   */
  static async recordOpen(enrollmentId) {
    const Outcome = await getOutcomeModel();

    try {
      const outcome = await Outcome.findOne({
        where: { enrollment_id: enrollmentId }
      });

      if (!outcome) {
        logger.warn('No outcome found for enrollment', { enrollmentId });
        return null;
      }

      const updates = {
        opened: true,
        open_count: outcome.open_count + 1
      };

      if (!outcome.first_opened_at) {
        updates.first_opened_at = new Date();
      }

      await outcome.update(updates);

      logger.debug('Recorded open', { enrollmentId, openCount: outcome.open_count + 1 });

      return outcome;
    } catch (error) {
      logger.error('Failed to record open', { error: error.message, enrollmentId });
      throw error;
    }
  }

  /**
   * Record a click event
   *
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Updated outcome
   */
  static async recordClick(enrollmentId) {
    const Outcome = await getOutcomeModel();

    try {
      const outcome = await Outcome.findOne({
        where: { enrollment_id: enrollmentId }
      });

      if (!outcome) {
        logger.warn('No outcome found for enrollment', { enrollmentId });
        return null;
      }

      await outcome.update({
        clicked: true,
        click_count: outcome.click_count + 1
      });

      logger.debug('Recorded click', { enrollmentId });

      return outcome;
    } catch (error) {
      logger.error('Failed to record click', { error: error.message, enrollmentId });
      throw error;
    }
  }

  /**
   * Record a reply event
   *
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} sentiment - Reply sentiment (positive/neutral/negative/objection)
   * @returns {Promise<Object>} Updated outcome
   */
  static async recordReply(enrollmentId, sentiment = null) {
    const Outcome = await getOutcomeModel();

    try {
      const outcome = await Outcome.findOne({
        where: { enrollment_id: enrollmentId }
      });

      if (!outcome) {
        logger.warn('No outcome found for enrollment', { enrollmentId });
        return null;
      }

      await outcome.update({
        replied: true,
        replied_at: new Date(),
        reply_sentiment: sentiment
      });

      logger.info('Recorded reply', { enrollmentId, sentiment });

      // Trigger learning update for positive outcomes
      if (sentiment === 'positive') {
        await this.updateLearnings();
      }

      return outcome;
    } catch (error) {
      logger.error('Failed to record reply', { error: error.message, enrollmentId });
      throw error;
    }
  }

  /**
   * Record a meeting booked event
   *
   * @param {string} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Updated outcome
   */
  static async recordMeeting(enrollmentId) {
    const Outcome = await getOutcomeModel();

    try {
      const outcome = await Outcome.findOne({
        where: { enrollment_id: enrollmentId }
      });

      if (!outcome) {
        logger.warn('No outcome found for enrollment', { enrollmentId });
        return null;
      }

      await outcome.update({
        meeting_booked: true,
        meeting_booked_at: new Date()
      });

      logger.info('Recorded meeting booked', { enrollmentId });

      // Trigger learning update for meetings
      await this.updateLearnings();

      return outcome;
    } catch (error) {
      logger.error('Failed to record meeting', { error: error.message, enrollmentId });
      throw error;
    }
  }

  /**
   * Record bounce/unsubscribe
   *
   * @param {string} enrollmentId - Enrollment ID
   * @param {string} type - 'bounce' or 'unsubscribe'
   * @returns {Promise<Object>} Updated outcome
   */
  static async recordNegativeOutcome(enrollmentId, type) {
    const Outcome = await getOutcomeModel();

    try {
      const outcome = await Outcome.findOne({
        where: { enrollment_id: enrollmentId }
      });

      if (!outcome) {
        logger.warn('No outcome found for enrollment', { enrollmentId });
        return null;
      }

      const updates = type === 'bounce'
        ? { bounced: true }
        : { unsubscribed: true };

      await outcome.update(updates);

      logger.info(`Recorded ${type}`, { enrollmentId });

      return outcome;
    } catch (error) {
      logger.error(`Failed to record ${type}`, { error: error.message, enrollmentId });
      throw error;
    }
  }

  /**
   * Get performance summary
   * PERFORMANCE: Uses AnalyticsCacheService for 40-100x speedup
   *
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Performance summary
   */
  static async getSummary(options = {}) {
    const cacheKey = AnalyticsCacheService.summaryKey(options);
    return AnalyticsCacheService.getOrCompute(
      'summary',
      cacheKey,
      async () => {
        const Outcome = await getOutcomeModel();
        return Outcome.getSummary(options);
      }
    );
  }

  /**
   * Get template performance rankings
   * PERFORMANCE: Uses AnalyticsCacheService for 100x speedup
   *
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Template rankings
   */
  static async getTemplateRankings(options = {}) {
    const { days = 30, minSamples = 10 } = options;
    const cacheKey = AnalyticsCacheService.templatePerformanceKey({ days, minSamples });
    return AnalyticsCacheService.getOrCompute(
      'templates',
      cacheKey,
      async () => {
        const Outcome = await getOutcomeModel();
        return Outcome.getTemplatePerformance(options);
      }
    );
  }

  /**
   * Get best template for a persona
   * PERFORMANCE: Uses AnalyticsCacheService for 50x speedup
   *
   * @param {string} persona - Target persona
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Best template
   */
  static async getBestTemplate(persona, options = {}) {
    const { days = 30, minSamples = 5 } = options;
    const cacheKey = AnalyticsCacheService.personaTemplateKey(persona, { days, minSamples });
    return AnalyticsCacheService.getOrCompute(
      'personas',
      cacheKey,
      async () => {
        const Outcome = await getOutcomeModel();
        return Outcome.getBestTemplateByPersona(persona, options);
      }
    );
  }

  /**
   * Update the learnings markdown files based on outcome data
   */
  static async updateLearnings() {
    try {
      const Outcome = await getOutcomeModel();

      // Get performance data
      const [templatePerformance, subjectLinePerformance, summary] = await Promise.all([
        Outcome.getTemplatePerformance({ days: 30, minSamples: 5 }),
        Outcome.getSubjectLinePerformance({ days: 30, minSamples: 5 }),
        Outcome.getSummary({ days: 30 })
      ]);

      // Update what-works.md
      await this.updateWhatWorks(templatePerformance, subjectLinePerformance, summary);

      // Update what-doesnt-work.md
      await this.updateWhatDoesntWork(templatePerformance, subjectLinePerformance, summary);

      logger.info('Updated learnings files');
    } catch (error) {
      logger.error('Failed to update learnings', { error: error.message });
      // RELIABILITY FIX: Add metrics counter for tracking failures
      metrics.counter('outcome_tracker.update_learnings.error', 1, {
        error_type: error.name || 'unknown'
      });
      // RELIABILITY FIX: Re-throw error so caller knows the operation failed
      throw error;
    }
  }

  /**
   * Update the what-works.md file
   * @private
   */
  static async updateWhatWorks(templates, subjects, summary) {
    const now = new Date().toISOString().split('T')[0];

    // Filter for high performers
    const winningSubjects = subjects.filter(s => parseFloat(s.open_rate) >= 50);
    const topTemplates = templates.filter(t => parseFloat(t.reply_rate) >= 10);

    let content = `# What's Working

*This file is automatically updated based on outreach outcomes. Last updated: ${now}*

---

## Winning Subject Lines

*Populated automatically when subject lines achieve >50% open rate*

| Subject Line | Open Rate | Sample Size | Date Added |
|--------------|-----------|-------------|------------|
`;

    if (winningSubjects.length > 0) {
      for (const subj of winningSubjects.slice(0, 10)) {
        content += `| ${this.truncateText(subj.subject_line, 50)} | ${subj.open_rate}% | ${subj.sent} | ${now} |\n`;
      }
    } else {
      content += `| *No data yet* | - | - | - |\n`;
    }

    content += `
---

## Best Performing Templates

*Templates with >10% reply rate*

| Template | Reply Rate | Meeting Rate | Sample Size |
|----------|------------|--------------|-------------|
`;

    if (topTemplates.length > 0) {
      for (const tmpl of topTemplates.slice(0, 10)) {
        content += `| ${tmpl.template} | ${tmpl.reply_rate}% | ${tmpl.meeting_rate}% | ${tmpl.sent} |\n`;
      }
    } else {
      content += `| *No data yet* | - | - | - |\n`;
    }

    content += `
---

## Performance Summary (Last 30 Days)

| Metric | Value |
|--------|-------|
| Total Sent | ${summary.total_sent} |
| Open Rate | ${summary.open_rate}% |
| Reply Rate | ${summary.reply_rate}% |
| Meeting Rate | ${summary.meeting_rate}% |

---

## Best Templates by Persona

*Updated based on performance data*

`;

    // Add persona-specific recommendations
    const personas = ['Head of Treasury', 'Head of Partnerships', 'CFO'];
    for (const persona of personas) {
      try {
        const best = await this.getBestTemplate(persona, { days: 30, minSamples: 3 });
        content += `### ${persona}\n`;
        if (best) {
          content += `- Best template: ${best.template_used}\n`;
          content += `- Sample size: ${best.total_sent}\n\n`;
        } else {
          content += `- Best template: *Not enough data yet*\n\n`;
        }
      } catch (e) {
        content += `### ${persona}\n- Best template: *Not enough data yet*\n\n`;
      }
    }

    // Write file
    await fs.writeFile(path.join(LEARNINGS_DIR, 'what-works.md'), content, 'utf-8');
  }

  /**
   * Update the what-doesnt-work.md file
   * @private
   */
  static async updateWhatDoesntWork(templates, subjects, summary) {
    const now = new Date().toISOString().split('T')[0];

    // Filter for poor performers
    const poorSubjects = subjects.filter(s => parseFloat(s.open_rate) < 20);
    const poorTemplates = templates.filter(t => parseFloat(t.reply_rate) < 3);

    let content = `# What Doesn't Work

*This file is automatically updated based on outreach outcomes. Last updated: ${now}*

---

## Subject Lines to Avoid

*Populated when subject lines achieve <20% open rate with sufficient sample*

| Subject Line | Open Rate | Why It Failed |
|--------------|-----------|---------------|
`;

    if (poorSubjects.length > 0) {
      for (const subj of poorSubjects.slice(0, 10)) {
        content += `| ${this.truncateText(subj.subject_line, 50)} | ${subj.open_rate}% | Low engagement |\n`;
      }
    } else {
      content += `| *No data yet* | - | - |\n`;
    }

    content += `
---

## Low-Performing Templates

*Templates with <3% reply rate*

| Template | Reply Rate | Sample Size | Notes |
|----------|------------|-------------|-------|
`;

    if (poorTemplates.length > 0) {
      for (const tmpl of poorTemplates.slice(0, 10)) {
        content += `| ${tmpl.template} | ${tmpl.reply_rate}% | ${tmpl.sent} | Consider revising |\n`;
      }
    } else {
      content += `| *No data yet* | - | - | - |\n`;
    }

    content += `
---

## Anti-Patterns Detected

*General patterns that correlate with poor performance*

| Pattern | Impact | Recommendation |
|---------|--------|----------------|
| High bounce rate (>${summary.bounce_rate > 5 ? 'DETECTED' : 'None'}) | Damages sender reputation | Improve data quality |
| High unsubscribe rate | Signals irrelevant content | Review targeting |

---

## Timing to Avoid

*Days/times with significantly lower engagement*

| Region | Avoid Day | Avoid Time | Why |
|--------|-----------|------------|-----|
| *Analysis pending* | - | - | - |
`;

    // Write file
    await fs.writeFile(path.join(LEARNINGS_DIR, 'what-doesnt-work.md'), content, 'utf-8');
  }

  /**
   * Truncate text for table display
   * @private
   */
  static truncateText(text, maxLength) {
    if (!text) return '*empty*';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate weekly performance digest
   *
   * @returns {Promise<string>} Digest content
   */
  static async generateWeeklyDigest() {
    const summary = await this.getSummary({ days: 7 });
    const templates = await this.getTemplateRankings({ days: 7, minSamples: 3 });

    const now = new Date().toISOString().split('T')[0];

    let digest = `# Weekly Outreach Performance Digest
**Week Ending: ${now}**

## Summary
- **Total Sent:** ${summary.total_sent}
- **Open Rate:** ${summary.open_rate}%
- **Reply Rate:** ${summary.reply_rate}%
- **Meeting Rate:** ${summary.meeting_rate}%
- **Bounce Rate:** ${summary.bounce_rate}%

## Top Performing Templates
`;

    if (templates.length > 0) {
      digest += '\n| Template | Sent | Reply Rate | Meeting Rate |\n';
      digest += '|----------|------|------------|-------------|\n';
      for (const t of templates.slice(0, 5)) {
        digest += `| ${t.template} | ${t.sent} | ${t.reply_rate}% | ${t.meeting_rate}% |\n`;
      }
    } else {
      digest += '\n*Not enough data this week*\n';
    }

    digest += `
## Recommendations
${parseFloat(summary.reply_rate) < 10 ? '- Reply rate below target. Review messaging and targeting.\n' : ''}${parseFloat(summary.bounce_rate) > 3 ? '- High bounce rate detected. Improve data quality checks.\n' : ''}${parseFloat(summary.meeting_rate) < 2 ? '- Meeting conversion below target. Strengthen CTAs.\n' : ''}
---
*Generated automatically by OutcomeTracker*
`;

    return digest;
  }
}

export default OutcomeTracker;
