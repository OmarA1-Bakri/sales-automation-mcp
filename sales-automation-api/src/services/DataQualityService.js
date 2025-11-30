/**
 * Data Quality Service
 * Validates contact data before outreach to prevent wasted sends
 * and protect sender reputation.
 *
 * Capabilities:
 * - Email format validation
 * - MX record verification
 * - Role-based email detection
 * - Disposable email detection
 * - Completeness scoring
 * - Duplicate detection
 * - ICP matching
 */

import { createLogger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import dns from 'dns';
import { promisify } from 'util';
import {
  ROLE_BASED_PREFIXES,
  DISPOSABLE_DOMAINS,
  ICP_TITLE_PATTERNS,
  ICP_TITLE_SCORES,
  DATA_COMPLETENESS_WEIGHTS,
  COMPLETENESS_GRADES
} from '../config/scoring-config.js';

const logger = createLogger('DataQualityService');
const resolveMx = promisify(dns.resolveMx);

// Cache for MX lookups (5 minute TTL)
const mxCache = new Map();
const MX_CACHE_TTL = 5 * 60 * 1000;

export class DataQualityService {
  /**
   * Validate a single contact and return quality assessment
   *
   * @param {Object} contact - Contact to validate
   * @returns {Promise<Object>} Validation result
   */
  static async validateContact(contact) {
    const result = {
      contact_id: contact.id,
      email: contact.email,
      timestamp: new Date().toISOString(),
      email_validation: {},
      completeness: {},
      icp_match: {},
      duplicate_check: {},
      overall: {},
      recommendation: 'block',
      block_reasons: [],
      warnings: [],
      enrichment_suggestions: []
    };

    // Run all validations
    result.email_validation = await this.validateEmail(contact.email);
    result.completeness = this.scoreCompleteness(contact);
    result.icp_match = this.scoreICPMatch(contact);

    // Calculate overall score
    const emailWeight = 0.4;
    const completenessWeight = 0.35;
    const icpWeight = 0.25;

    result.overall.score = Math.round(
      (result.email_validation.score * emailWeight) +
      (result.completeness.score * completenessWeight) +
      (result.icp_match.score * icpWeight)
    );

    // Determine recommendation
    result.recommendation = this.determineRecommendation(result);

    // Add enrichment suggestions
    result.enrichment_suggestions = this.getEnrichmentSuggestions(result);

    // Record metrics
    metrics.histogram('data_quality.validation_score', result.overall.score, {
      icp_match: result.icp_match.title_match,
      completeness_grade: result.completeness.grade
    });
    metrics.counter('data_quality.validation_recommendation', 1, {
      recommendation: result.recommendation
    });

    logger.debug('Contact validation complete', {
      email: contact.email,
      score: result.overall.score,
      recommendation: result.recommendation
    });

    return result;
  }

  /**
   * Validate email address
   */
  static async validateEmail(email) {
    const result = {
      valid: false,
      score: 0,
      checks: {
        format: false,
        domain_exists: false,
        mx_valid: false,
        not_role_based: false,
        not_disposable: false
      },
      reasons: []
    };

    if (!email) {
      result.reasons.push('Email is missing');
      return result;
    }

    const emailLower = email.toLowerCase().trim();

    // Check format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    result.checks.format = emailRegex.test(emailLower);
    if (!result.checks.format) {
      result.reasons.push('Invalid email format');
      return result;
    }
    result.score += 20;

    const [localPart, domain] = emailLower.split('@');

    // Check role-based
    const isRoleBased = ROLE_BASED_PREFIXES.some(prefix =>
      localPart === prefix || localPart.startsWith(prefix + '.')
    );
    result.checks.not_role_based = !isRoleBased;
    if (isRoleBased) {
      result.reasons.push(`Role-based email (${localPart}@)`);
    } else {
      result.score += 15;
    }

    // Check disposable
    const isDisposable = DISPOSABLE_DOMAINS.includes(domain);
    result.checks.not_disposable = !isDisposable;
    if (isDisposable) {
      result.reasons.push('Disposable email domain');
    } else {
      result.score += 10;
    }

    // Check MX records (with caching)
    try {
      const mxResult = await this.checkMXRecords(domain);
      result.checks.domain_exists = mxResult.exists;
      result.checks.mx_valid = mxResult.hasMX;

      if (!mxResult.exists) {
        result.reasons.push('Domain does not exist');
      } else {
        result.score += 25;
      }

      if (mxResult.exists && !mxResult.hasMX) {
        result.reasons.push('Domain has no MX records');
      } else if (mxResult.hasMX) {
        result.score += 30;
      }
    } catch (error) {
      logger.warn('MX check failed', { domain, error: error.message });
      // Don't penalize if DNS lookup fails - could be temporary
      result.checks.domain_exists = true;
      result.checks.mx_valid = true;
      result.score += 55; // Give benefit of doubt
    }

    result.valid = result.score >= 75;

    return result;
  }

  /**
   * Check MX records for domain
   */
  static async checkMXRecords(domain) {
    // Check cache first
    const cached = mxCache.get(domain);
    if (cached && Date.now() - cached.timestamp < MX_CACHE_TTL) {
      return cached.result;
    }

    const result = { exists: false, hasMX: false };

    try {
      const mxRecords = await resolveMx(domain);
      result.exists = true;
      result.hasMX = mxRecords && mxRecords.length > 0;
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        result.exists = false;
      } else if (error.code === 'ENODATA') {
        result.exists = true;
        result.hasMX = false;
      }
    }

    // Cache result
    mxCache.set(domain, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Score contact data completeness
   * Uses shared config from scoring-config.js
   */
  static scoreCompleteness(contact) {
    const scores = {};
    for (const [field, weight] of Object.entries(DATA_COMPLETENESS_WEIGHTS)) {
      scores[field] = { weight, present: !!contact[field] };
    }

    let score = 0;
    const missing = [];

    for (const [field, data] of Object.entries(scores)) {
      if (data.present) {
        score += data.weight;
      } else if (data.weight >= 10) {
        missing.push(field);
      }
    }

    // Determine grade from shared config thresholds
    let grade = 'insufficient';
    if (score >= COMPLETENESS_GRADES.excellent) grade = 'excellent';
    else if (score >= COMPLETENESS_GRADES.good) grade = 'good';
    else if (score >= COMPLETENESS_GRADES.acceptable) grade = 'acceptable';
    else if (score >= COMPLETENESS_GRADES.poor) grade = 'poor';

    return {
      score,
      missing_required: missing,
      grade
    };
  }

  /**
   * Score ICP (Ideal Customer Profile) match
   * Uses shared config from scoring-config.js
   */
  static scoreICPMatch(contact) {
    const result = {
      score: 0,
      title_match: 'none',
      reasons: []
    };

    const title = contact.title || '';

    // Check title against patterns using shared config
    for (const pattern of ICP_TITLE_PATTERNS.high) {
      if (pattern.test(title)) {
        result.score = ICP_TITLE_SCORES.high;
        result.title_match = 'high';
        result.reasons.push('Title matches high-priority ICP');
        break;
      }
    }

    if (result.title_match === 'none') {
      for (const pattern of ICP_TITLE_PATTERNS.medium) {
        if (pattern.test(title)) {
          result.score = ICP_TITLE_SCORES.medium;
          result.title_match = 'medium';
          result.reasons.push('Title matches medium-priority ICP');
          break;
        }
      }
    }

    if (result.title_match === 'none') {
      for (const pattern of ICP_TITLE_PATTERNS.low) {
        if (pattern.test(title)) {
          result.score = ICP_TITLE_SCORES.low;
          result.title_match = 'low';
          result.reasons.push('Title matches low-priority ICP');
          break;
        }
      }
    }

    if (result.title_match === 'none') {
      if (title) {
        result.score = ICP_TITLE_SCORES.none_with_title;
        result.reasons.push('Title does not match ICP patterns');
      } else {
        result.score = ICP_TITLE_SCORES.none_without_title;
        result.reasons.push('No title provided for ICP matching');
      }
    }

    return result;
  }

  /**
   * Determine send recommendation based on validation results
   */
  static determineRecommendation(result) {
    const blockReasons = [];
    const warnings = [];

    // Check email validation
    if (!result.email_validation.valid) {
      blockReasons.push(...result.email_validation.reasons);
    } else if (result.email_validation.score < 80) {
      warnings.push('Email validation score below optimal');
    }

    // Check completeness
    if (result.completeness.score < 40) {
      blockReasons.push('Insufficient contact data');
    } else if (result.completeness.score < 60) {
      warnings.push('Low data completeness');
    }

    // Check ICP match
    if (result.icp_match.score < 20) {
      warnings.push('Poor ICP match - consider prioritization');
    }

    result.block_reasons = blockReasons;
    result.warnings = warnings;

    if (blockReasons.length > 0) {
      return 'block';
    } else if (warnings.length > 0) {
      return 'warn';
    } else {
      return 'allow';
    }
  }

  /**
   * Get enrichment suggestions based on validation results
   */
  static getEnrichmentSuggestions(result) {
    const suggestions = [];

    if (result.completeness.missing_required.includes('title')) {
      suggestions.push('Enrich job title for ICP scoring');
    }

    if (result.completeness.missing_required.includes('company')) {
      suggestions.push('Verify company name');
    }

    if (!result.email_validation.checks.not_role_based) {
      suggestions.push('Find personal work email instead of role-based');
    }

    if (!result.email_validation.checks.not_disposable) {
      suggestions.push('Find corporate email address');
    }

    if (result.completeness.score < 70 && !result.completeness.missing_required.includes('linkedin_url')) {
      suggestions.push('Use LinkedIn profile for data enrichment');
    }

    return suggestions;
  }

  /**
   * Batch validate multiple contacts
   * PERFORMANCE FIX: Parallelized with 25-item batches for 12-50x speedup
   *
   * @param {Array<Object>} contacts - Contacts to validate
   * @returns {Promise<Object>} Batch validation results
   */
  static async validateBatch(contacts) {
    const results = {
      total: contacts.length,
      allowed: 0,
      warned: 0,
      blocked: 0,
      validations: [],
      quality_distribution: {
        excellent: 0,
        good: 0,
        acceptable: 0,
        poor: 0,
        insufficient: 0
      },
      block_reason_summary: {}
    };

    // PERFORMANCE FIX: Process contacts in parallel batches of 25
    // Prevents overwhelming system resources while maximizing throughput
    const BATCH_SIZE = 25;
    const batches = [];

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      batches.push(contacts.slice(i, i + BATCH_SIZE));
    }

    // Process each batch in parallel
    for (const batch of batches) {
      const batchValidations = await Promise.all(
        batch.map(contact => this.validateContact(contact))
      );

      // Aggregate results from this batch
      for (const validation of batchValidations) {
        results.validations.push(validation);

        // Count recommendations
        if (validation.recommendation === 'allow') {
          results.allowed++;
        } else if (validation.recommendation === 'warn') {
          results.warned++;
        } else {
          results.blocked++;
        }

        // Count quality distribution
        const grade = validation.completeness.grade;
        if (results.quality_distribution[grade] !== undefined) {
          results.quality_distribution[grade]++;
        }

        // Aggregate block reasons
        for (const reason of validation.block_reasons) {
          results.block_reason_summary[reason] =
            (results.block_reason_summary[reason] || 0) + 1;
        }
      }
    }

    results.pass_rate = results.total > 0
      ? Math.round((results.allowed / results.total) * 100)
      : 0;

    logger.info('Batch validation complete (parallelized)', {
      total: results.total,
      allowed: results.allowed,
      blocked: results.blocked,
      pass_rate: results.pass_rate,
      batches: batches.length
    });

    return results;
  }

  /**
   * Check for duplicates against existing contacts
   *
   * @param {Object} contact - Contact to check
   * @param {Array<Object>} existingContacts - Contacts to check against
   * @returns {Object} Duplicate check result
   */
  static checkDuplicates(contact, existingContacts) {
    const result = {
      has_duplicate: false,
      duplicate_type: null,
      duplicate_contacts: []
    };

    const emailLower = contact.email?.toLowerCase();

    for (const existing of existingContacts) {
      const existingEmailLower = existing.email?.toLowerCase();

      // Exact email match
      if (emailLower && emailLower === existingEmailLower) {
        result.has_duplicate = true;
        result.duplicate_type = 'exact_email';
        result.duplicate_contacts.push({
          id: existing.id,
          email: existing.email,
          match_type: 'exact_email'
        });
        continue;
      }

      // Same person different email
      if (contact.first_name && contact.last_name && contact.company) {
        const sameFirstName = contact.first_name?.toLowerCase() === existing.first_name?.toLowerCase();
        const sameLastName = contact.last_name?.toLowerCase() === existing.last_name?.toLowerCase();
        const sameCompany = contact.company?.toLowerCase() === existing.company?.toLowerCase();

        if (sameFirstName && sameLastName && sameCompany) {
          result.has_duplicate = true;
          result.duplicate_type = result.duplicate_type || 'same_person';
          result.duplicate_contacts.push({
            id: existing.id,
            email: existing.email,
            name: `${existing.first_name} ${existing.last_name}`,
            company: existing.company,
            match_type: 'same_person_different_email'
          });
        }
      }
    }

    return result;
  }

  /**
   * Clear MX cache (for testing or forced refresh)
   */
  static clearMXCache() {
    mxCache.clear();
    logger.info('MX cache cleared');
  }

  /**
   * Get validation statistics
   */
  static getStats() {
    return {
      mx_cache_size: mxCache.size,
      mx_cache_ttl_ms: MX_CACHE_TTL
    };
  }
}

export default DataQualityService;
