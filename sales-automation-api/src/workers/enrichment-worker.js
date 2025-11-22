/**
 * Enrichment Worker - Sales Automation
 *
 * Handles background enrichment of contacts and companies using Explorium.
 * Manages batch processing, rate limiting, caching, and quality scoring.
 *
 * Key Features:
 * - Batch enrichment with configurable batch sizes
 * - Automatic rate limit management
 * - Enrichment caching (30-day TTL)
 * - Data quality scoring
 * - Pain point hypothesis generation
 * - Personalization hook extraction
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';

export class EnrichmentWorker extends EventEmitter {
  constructor(clients, database) {
    super();

    this.explorium = clients.explorium;
    this.hubspot = clients.hubspot;
    this.database = database;

    // Enrichment cache (30-day TTL)
    this.cacheEnabled = true;
    this.cacheTTL = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    // SECURITY FIX: Phase 2, T2.4 - Use secure logger with PII redaction
    this.logger = createLogger('EnrichmentWorker');
  }

  // ==========================================================================
  // CONTACT ENRICHMENT
  // ==========================================================================

  /**
   * Enrich a single contact with company and contact data
   * @param {Object} contact - Contact to enrich
   * @returns {Promise<Object>} Enriched contact data
   */
  async enrichContact(contact) {
    const { email, firstName, lastName, companyDomain } = contact;

    try {
      // Check cache first
      if (this.cacheEnabled) {
        const cached = await this._getCachedEnrichment('contact', email);
        if (cached) {
          // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
          this.logger.info('Using cached data for contact', { email });
          return cached;
        }
      }

      // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
      this.logger.info('Enriching contact', { email });

      // Step 1: Enrich company (if domain provided)
      let companyData = null;
      if (companyDomain) {
        companyData = await this.enrichCompany({ domain: companyDomain });
      }

      // Step 2: Enrich contact
      const contactData = await this.explorium.enrichContact({
        email,
        firstName,
        lastName,
        companyDomain,
      });

      // Step 3: Calculate data quality score
      const qualityScore = this._calculateQualityScore(contactData, companyData);

      // Step 4: Generate intelligence (pain points, hooks)
      const intelligence = await this._generateIntelligence(
        contactData,
        companyData
      );

      const enrichedData = {
        ...contactData,
        company: companyData,
        dataQuality: qualityScore,
        intelligence,
        enrichedAt: new Date().toISOString(),
        source: 'explorium',
      };

      // Cache the result
      if (this.cacheEnabled) {
        await this._cacheEnrichment('contact', email, enrichedData);
      }

      return {
        success: true,
        contact: enrichedData,
        qualityScore,
      };
    } catch (error) {
      // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
      this.logger.error('Failed to enrich contact', { email, error: error.message });
      return {
        success: false,
        error: error.message,
        contact: { email, firstName, lastName, companyDomain },
      };
    }
  }

  /**
   * Enrich contacts (wrapper for batchEnrichContacts with sensible defaults)
   * Used by automation workflows
   * @param {Array} contacts - Array of contacts to enrich
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Enrichment results
   */
  async enrichContacts(contacts, options = {}) {
    return this.batchEnrichContacts(contacts, {
      batchSize: options.batchSize || 50,
      minQuality: options.minQuality || 0.7,
      skipCache: options.cache === false,
      parallel: false,
    });
  }

  /**
   * Batch enrich multiple contacts
   * @param {Array} contacts - Array of contacts to enrich
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch enrichment results
   */
  async batchEnrichContacts(contacts, options = {}) {
    const {
      batchSize = 50,
      minQuality = 0.7,
      skipCache = false,
      parallel = false,
    } = options;

    this.logger.info('Starting batch enrichment', { count: contacts.length });

    const results = {
      total: contacts.length,
      enriched: [],
      failed: [],
      cached: 0,
      belowQuality: 0,
    };

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      this.logger.info('Processing batch', {
        batchNumber: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(contacts.length / batchSize),
      });

      const batchPromises = batch.map((contact) =>
        this.enrichContact(contact).catch((error) => ({
          success: false,
          error: error.message,
          contact,
        }))
      );

      const batchResults = parallel
        ? await Promise.all(batchPromises)
        : await this._processSequentially(batchPromises);

      // Categorize results
      for (const result of batchResults) {
        if (result.success) {
          if (result.qualityScore >= minQuality) {
            results.enriched.push(result.contact);
          } else {
            results.belowQuality++;
            // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
            this.logger.info('Skipping contact - quality score below threshold', {
              email: result.contact.email,
              qualityScore: result.qualityScore,
              minQuality,
            });
          }
        } else {
          results.failed.push(result);
        }
      }

      // Respect rate limits between batches
      if (i + batchSize < contacts.length) {
        await this._sleep(1000); // 1 second between batches
      }
    }

    this.logger.info('Batch enrichment complete', {
      enriched: results.enriched.length,
      total: contacts.length,
    });

    // Emit event for automatic sync
    if (results.enriched.length > 0) {
      this.logger.info('Emitting contacts-enriched event', {
        count: results.enriched.length,
      });
      this.emit('contacts-enriched', {
        contacts: results.enriched,
        count: results.enriched.length,
        qualityThreshold: minQuality,
      });
    }

    return results;
  }

  // ==========================================================================
  // COMPANY ENRICHMENT
  // ==========================================================================

  /**
   * Enrich a company with firmographics and signals
   * @param {Object} company - Company identifier
   * @returns {Promise<Object>} Enriched company data
   */
  async enrichCompany(company) {
    const { domain, name, linkedinUrl } = company;
    const key = domain || name || linkedinUrl;

    try {
      // Check cache
      if (this.cacheEnabled) {
        const cached = await this._getCachedEnrichment('company', key);
        if (cached) {
          this.logger.info('Using cached company data', { companyKey: key });
          return cached;
        }
      }

      this.logger.info('Enriching company', { companyKey: key });

      // Enrich via Explorium
      const companyData = await this.explorium.enrichCompany({
        domain,
        name,
        linkedinUrl,
      });

      // Cache result
      if (this.cacheEnabled) {
        await this._cacheEnrichment('company', key, companyData);
      }

      return companyData;
    } catch (error) {
      this.logger.error('Failed to enrich company', {
        companyKey: key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Batch enrich companies
   * @param {Array} companies - Array of company identifiers
   * @returns {Promise<Object>} Batch results
   */
  async batchEnrichCompanies(companies, options = {}) {
    const { batchSize = 50 } = options;

    this.logger.info('Starting batch company enrichment', {
      count: companies.length,
    });

    const results = {
      total: companies.length,
      enriched: [],
      failed: [],
    };

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((company) =>
          this.enrichCompany(company).catch((error) => ({
            error: error.message,
            company,
          }))
        )
      );

      for (const result of batchResults) {
        if (result && !result.error) {
          results.enriched.push(result);
        } else {
          results.failed.push(result);
        }
      }

      if (i + batchSize < companies.length) {
        await this._sleep(1000);
      }
    }

    this.logger.info('Company batch enrichment complete', {
      enriched: results.enriched.length,
      total: companies.length,
    });

    return results;
  }

  // ==========================================================================
  // INTELLIGENCE GENERATION
  // ==========================================================================

  /**
   * Generate sales intelligence from enriched data
   * @private
   */
  async _generateIntelligence(contactData, companyData) {
    if (!companyData) {
      return {
        painHypotheses: [],
        personalizationHooks: [],
        whyNow: null,
      };
    }

    // Extract signals from company data
    const signals = companyData.signals || companyData.growthSignals || [];
    const technologies = companyData.technologies || companyData.techStack || [];
    const industry = companyData.industry || '';
    const employees = companyData.employees || 0;
    const fundingStage = companyData.fundingStage || '';

    // Generate pain hypotheses based on signals and profile
    const painHypotheses = this._generatePainHypotheses({
      signals,
      industry,
      employees,
      fundingStage,
      technologies,
    });

    // Extract personalization hooks
    const personalizationHooks = this._extractPersonalizationHooks({
      signals,
      fundingStage,
      companyData,
    });

    // Determine "why now" trigger
    const whyNow = this._determineWhyNow(signals, companyData);

    return {
      painHypotheses,
      personalizationHooks,
      whyNow,
    };
  }

  /**
   * Generate pain hypotheses based on company profile
   * @private
   */
  _generatePainHypotheses(profile) {
    const { signals, industry, employees, fundingStage, technologies } = profile;
    const hypotheses = [];

    // Check for expansion signals
    if (signals.includes('expansion') || signals.includes('geographic_expansion')) {
      hypotheses.push({
        pain: 'Liquidity management across multiple markets',
        confidence: 0.85,
        reasoning: 'Company is expanding geographically',
        icpAlignment: 'High - expansion requires treasury infrastructure',
      });
    }

    // Check for funding signals
    if (signals.includes('funding') || fundingStage.includes('Series')) {
      hypotheses.push({
        pain: 'Managing increased transaction volumes',
        confidence: 0.8,
        reasoning: `Recent funding (${fundingStage}) indicates growth phase`,
        icpAlignment: 'High - growing PSPs need scalable infrastructure',
      });
    }

    // Check for hiring signals
    if (signals.includes('hiring')) {
      hypotheses.push({
        pain: 'Scaling operations and reducing manual work',
        confidence: 0.75,
        reasoning: 'Company is actively hiring',
        icpAlignment: 'Medium - automation can reduce headcount needs',
      });
    }

    // Industry-specific pain points
    if (industry.toLowerCase().includes('payment') || industry.toLowerCase().includes('fintech')) {
      hypotheses.push({
        pain: 'Regulatory compliance and reporting',
        confidence: 0.7,
        reasoning: 'Payment industry faces strict regulatory requirements',
        icpAlignment: 'High - RTGS provides compliance-ready solutions',
      });
    }

    // Technology-based pain points
    if (technologies.some((tech) => tech.toLowerCase().includes('legacy'))) {
      hypotheses.push({
        pain: 'Modernizing legacy infrastructure',
        confidence: 0.8,
        reasoning: 'Company uses legacy technology stack',
        icpAlignment: 'High - RTGS offers modern API-first platform',
      });
    }

    return hypotheses;
  }

  /**
   * Extract personalization hooks from signals
   * @private
   */
  _extractPersonalizationHooks(data) {
    const { signals, fundingStage, companyData } = data;
    const hooks = [];

    if (signals.includes('funding') && fundingStage) {
      hooks.push({
        hook: `Recent ${fundingStage} funding`,
        strength: 0.9,
        usage: `Congratulations on your ${fundingStage} round. What are your plans for scaling?`,
      });
    }

    if (signals.includes('expansion')) {
      hooks.push({
        hook: 'Geographic expansion',
        strength: 0.85,
        usage: 'I noticed you\'re expanding into new markets. How are you handling multi-currency settlement?',
      });
    }

    if (signals.includes('hiring')) {
      hooks.push({
        hook: 'Team growth',
        strength: 0.75,
        usage: 'Saw you\'re hiring for treasury roles. Are you looking to automate workflows?',
      });
    }

    if (companyData.newProducts && companyData.newProducts.length > 0) {
      hooks.push({
        hook: 'New product launch',
        strength: 0.8,
        usage: `Your new ${companyData.newProducts[0]} product looks interesting. How will it impact your treasury operations?`,
      });
    }

    return hooks;
  }

  /**
   * Determine urgency trigger
   * @private
   */
  _determineWhyNow(signals, companyData) {
    if (signals.includes('funding')) {
      return {
        trigger: 'Recent funding round',
        urgency: 'high',
        reasoning: 'Companies prioritize infrastructure investments post-funding',
      };
    }

    if (signals.includes('expansion')) {
      return {
        trigger: 'Geographic expansion',
        urgency: 'high',
        reasoning: 'Expansion creates immediate need for multi-market treasury',
      };
    }

    if (signals.includes('regulatory')) {
      return {
        trigger: 'Regulatory changes',
        urgency: 'high',
        reasoning: 'Compliance deadlines create time pressure',
      };
    }

    if (signals.includes('hiring')) {
      return {
        trigger: 'Team scaling',
        urgency: 'medium',
        reasoning: 'Growing teams indicate operational scaling needs',
      };
    }

    return null;
  }

  // ==========================================================================
  // QUALITY SCORING
  // ==========================================================================

  /**
   * Calculate data quality score (0-1)
   * @private
   */
  _calculateQualityScore(contactData, companyData) {
    let score = 0;
    let maxScore = 0;

    // Contact data quality (40 points)
    if (contactData) {
      maxScore += 40;

      if (contactData.email) score += 10;
      if (contactData.emailVerified) score += 10;
      if (contactData.title) score += 5;
      if (contactData.linkedinUrl) score += 5;
      if (contactData.phoneNumber) score += 5;
      if (contactData.location) score += 5;
    }

    // Company data quality (40 points)
    if (companyData) {
      maxScore += 40;

      if (companyData.name) score += 5;
      if (companyData.domain) score += 5;
      if (companyData.industry) score += 5;
      if (companyData.employees) score += 5;
      if (companyData.revenue) score += 5;
      if (companyData.technologies && companyData.technologies.length > 0)
        score += 5;
      if (companyData.fundingStage) score += 5;
      if (companyData.signals && companyData.signals.length > 0) score += 5;
    }

    // Confidence scores (20 points)
    maxScore += 20;
    if (contactData && contactData.confidenceScore) {
      score += contactData.confidenceScore * 10;
    }
    if (companyData && companyData.confidenceScore) {
      score += companyData.confidenceScore * 10;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  /**
   * Get cached enrichment data
   * @private
   */
  async _getCachedEnrichment(type, key) {
    try {
      const stmt = this.database.db.prepare(
        'SELECT data, cached_at FROM enrichment_cache WHERE type = ? AND key = ?'
      );
      const row = stmt.get(type, key);

      if (!row) return null;

      const cachedAt = new Date(row.cached_at).getTime();
      const age = Date.now() - cachedAt;

      // Check if cache is still valid
      if (age > this.cacheTTL) {
        // Cache expired, delete it
        this.database.db
          .prepare('DELETE FROM enrichment_cache WHERE type = ? AND key = ?')
          .run(type, key);
        return null;
      }

      return JSON.parse(row.data);
    } catch (error) {
      this.logger.error('Cache read error', { error: error.message });
      return null;
    }
  }

  /**
   * Cache enrichment data
   * @private
   */
  async _cacheEnrichment(type, key, data) {
    try {
      const stmt = this.database.db.prepare(`
        INSERT OR REPLACE INTO enrichment_cache (type, key, data, cached_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      stmt.run(type, key, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Cache write error', { error: error.message });
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  async _processSequentially(promises) {
    const results = [];
    for (const promise of promises) {
      results.push(await promise);
    }
    return results;
  }

  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get enrichment statistics
   */
  async getStats() {
    try {
      const stats = this.database
        .prepare(
          `
        SELECT
          COUNT(*) as total_cached,
          SUM(CASE WHEN type = 'contact' THEN 1 ELSE 0 END) as contacts_cached,
          SUM(CASE WHEN type = 'company' THEN 1 ELSE 0 END) as companies_cached
        FROM enrichment_cache
      `
        )
        .get();

      return {
        ...stats,
        rateLimiter: this.rateLimiter.getStatus(),
        cacheEnabled: this.cacheEnabled,
        cacheTTL: this.cacheTTL / (24 * 60 * 60 * 1000) + ' days',
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }
}

export default EnrichmentWorker;
