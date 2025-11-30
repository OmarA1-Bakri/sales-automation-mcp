/**
 * Knowledge Service
 * Loads and provides access to the markdown-based knowledge repository
 * for AI-powered outreach personalization and response handling.
 *
 * Knowledge Categories:
 * - company: Case studies, value props, product facts
 * - competitive: Battle cards for competitor handling
 * - industry: Playbooks for PSP and Treasury personas
 * - learnings: What works/doesn't work (populated by outcome tracking)
 */

import { createLogger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const logger = createLogger('KnowledgeService');

// Get the project root (3 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'knowledge');

/**
 * Cache for loaded knowledge files
 * Structure: { category/filename: { content, loadedAt, metadata } }
 */
const knowledgeCache = new Map();

/**
 * Cache TTL in milliseconds (5 minutes)
 * Allows hot-reloading of knowledge during development
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Whitelist of allowed knowledge categories (prevents path traversal)
 */
const ALLOWED_CATEGORIES = ['company', 'competitive', 'industry', 'learnings'];

export class KnowledgeService {
  /**
   * Load a specific knowledge file
   *
   * @param {string} category - Knowledge category (company, competitive, industry, learnings)
   * @param {string} filename - File name without extension
   * @returns {Promise<string|null>} File content or null if not found
   * @throws {Error} If category or filename contains path traversal attempts
   */
  static async loadKnowledgeFile(category, filename) {
    // SECURITY FIX: Validate category against whitelist
    if (!ALLOWED_CATEGORIES.includes(category)) {
      logger.warn('Invalid knowledge category attempted', { category, filename });
      throw new Error(`Invalid category: ${category}. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
    }

    // SECURITY FIX: Sanitize filename - remove path separators and parent directory references
    const sanitizedFilename = filename.replace(/[\/\\\.]/g, '');
    if (sanitizedFilename !== filename) {
      logger.warn('Path traversal attempt detected in filename', {
        category,
        original: filename,
        sanitized: sanitizedFilename
      });
      throw new Error('Invalid filename: path separators and dots are not allowed');
    }

    const cacheKey = `${category}/${sanitizedFilename}`;
    const cached = knowledgeCache.get(cacheKey);

    // Return cached if still valid
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
      metrics.counter('knowledge_service.cache', 1, { result: 'hit', category });
      return cached.content;
    }
    metrics.counter('knowledge_service.cache', 1, { result: 'miss', category });

    const filePath = path.join(KNOWLEDGE_DIR, category, `${sanitizedFilename}.md`);

    // SECURITY FIX: Validate the resolved path stays within KNOWLEDGE_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedKnowledgeDir = path.resolve(KNOWLEDGE_DIR);
    if (!resolvedPath.startsWith(resolvedKnowledgeDir)) {
      logger.error('Path traversal attempt detected', {
        category,
        filename: sanitizedFilename,
        attemptedPath: resolvedPath,
        allowedDir: resolvedKnowledgeDir
      });
      throw new Error('Access denied: path traversal detected');
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      knowledgeCache.set(cacheKey, {
        content,
        loadedAt: Date.now(),
        path: filePath
      });

      metrics.counter('knowledge_service.file_load', 1, { result: 'success', category });
      logger.debug('Loaded knowledge file', { category, filename: sanitizedFilename });
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        metrics.counter('knowledge_service.file_load', 1, { result: 'not_found', category });
        logger.warn('Knowledge file not found', { category, filename: sanitizedFilename, path: filePath });
        return null;
      }
      metrics.counter('knowledge_service.file_load', 1, { result: 'error', category });
      logger.error('Error loading knowledge file', {
        category,
        filename: sanitizedFilename,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all case studies
   * @returns {Promise<string|null>}
   */
  static async getCaseStudies() {
    return this.loadKnowledgeFile('company', 'case-studies');
  }

  /**
   * Get value propositions
   * @returns {Promise<string|null>}
   */
  static async getValuePropositions() {
    return this.loadKnowledgeFile('company', 'value-propositions');
  }

  /**
   * Get product facts
   * @returns {Promise<string|null>}
   */
  static async getProductFacts() {
    return this.loadKnowledgeFile('company', 'product-facts');
  }

  /**
   * Get competitive battle cards
   * @returns {Promise<string|null>}
   */
  static async getBattleCards() {
    return this.loadKnowledgeFile('competitive', 'battle-cards');
  }

  /**
   * Get PSP industry playbook
   * @returns {Promise<string|null>}
   */
  static async getPSPPlaybook() {
    return this.loadKnowledgeFile('industry', 'psp-playbook');
  }

  /**
   * Get Treasury playbook
   * @returns {Promise<string|null>}
   */
  static async getTreasuryPlaybook() {
    return this.loadKnowledgeFile('industry', 'treasury-playbook');
  }

  /**
   * Get learnings about what works
   * @returns {Promise<string|null>}
   */
  static async getWhatWorks() {
    return this.loadKnowledgeFile('learnings', 'what-works');
  }

  /**
   * Get learnings about what doesn't work
   * @returns {Promise<string|null>}
   */
  static async getWhatDoesntWork() {
    return this.loadKnowledgeFile('learnings', 'what-doesnt-work');
  }

  /**
   * Get knowledge context for a specific persona
   * Returns relevant knowledge for AI to use when generating outreach
   *
   * @param {string} persona - Prospect persona (e.g., 'Head of Treasury', 'CFO')
   * @param {Object} options - Additional options
   * @param {boolean} options.includeCompetitive - Include battle cards
   * @param {boolean} options.includeLearnings - Include what works/doesn't
   * @returns {Promise<Object>} Knowledge context for AI
   */
  static async getContextForPersona(persona, options = {}) {
    const {
      includeCompetitive = true,
      includeLearnings = true
    } = options;

    const personaLower = persona?.toLowerCase() || '';

    // Determine which playbook is relevant
    const isTreasury = personaLower.includes('treasury') ||
                       personaLower.includes('finance') ||
                       personaLower.includes('cfo');

    const context = {
      persona,
      retrievedAt: new Date().toISOString(),
      knowledge: {}
    };

    // Load base knowledge
    const [caseStudies, valueProps, productFacts] = await Promise.all([
      this.getCaseStudies(),
      this.getValuePropositions(),
      this.getProductFacts()
    ]);

    context.knowledge.caseStudies = caseStudies;
    context.knowledge.valuePropositions = valueProps;
    context.knowledge.productFacts = productFacts;

    // Load persona-specific playbook
    if (isTreasury) {
      context.knowledge.playbook = await this.getTreasuryPlaybook();
      context.playbookType = 'treasury';
    } else {
      context.knowledge.playbook = await this.getPSPPlaybook();
      context.playbookType = 'psp';
    }

    // Optional: competitive intelligence
    if (includeCompetitive) {
      context.knowledge.battleCards = await this.getBattleCards();
    }

    // Optional: learnings from outcomes
    if (includeLearnings) {
      const [whatWorks, whatDoesntWork] = await Promise.all([
        this.getWhatWorks(),
        this.getWhatDoesntWork()
      ]);
      context.knowledge.whatWorks = whatWorks;
      context.knowledge.whatDoesntWork = whatDoesntWork;
    }

    logger.info('Built knowledge context for persona', {
      persona,
      playbookType: context.playbookType,
      hasCompetitive: includeCompetitive,
      hasLearnings: includeLearnings
    });

    return context;
  }

  /**
   * Get knowledge for handling objections
   * Returns battle cards and relevant playbook sections
   *
   * @param {string} objectionType - Type of objection (e.g., 'competitor_mention', 'timing', 'budget')
   * @param {string} competitor - Optional competitor name if mentioned
   * @returns {Promise<Object>} Objection handling context
   */
  static async getObjectionContext(objectionType, competitor = null) {
    const context = {
      objectionType,
      competitor,
      retrievedAt: new Date().toISOString(),
      knowledge: {}
    };

    // Always load battle cards for objection handling
    context.knowledge.battleCards = await this.getBattleCards();
    context.knowledge.valuePropositions = await this.getValuePropositions();

    // If competitor mentioned, extract relevant section
    if (competitor) {
      context.knowledge.competitorFocus = this.extractCompetitorSection(
        context.knowledge.battleCards,
        competitor
      );
    }

    return context;
  }

  /**
   * Extract specific competitor section from battle cards
   * @private
   */
  static extractCompetitorSection(battleCardsContent, competitor) {
    if (!battleCardsContent || !competitor) return null;

    const competitorLower = competitor.toLowerCase();

    // Known competitor mappings
    const competitorPatterns = {
      'swift': /## SWIFT.*?(?=## |$)/s,
      'wise': /## Wise.*?(?=## |$)/s,
      'transferwise': /## Wise.*?(?=## |$)/s,
      'ripple': /## Ripple.*?(?=## |$)/s,
      'xrp': /## Ripple.*?(?=## |$)/s,
      'currencycloud': /## Currencycloud.*?(?=## |$)/s,
      'bank': /## Banking Rails.*?(?=## |$)/s,
      'correspondent': /## SWIFT.*?(?=## |$)/s
    };

    for (const [key, pattern] of Object.entries(competitorPatterns)) {
      if (competitorLower.includes(key)) {
        const match = battleCardsContent.match(pattern);
        if (match) return match[0];
      }
    }

    return null;
  }

  /**
   * Get best case study for a given pain point
   *
   * @param {string} painPoint - Primary pain point (liquidity, speed, cost, expansion, compliance)
   * @returns {Promise<Object>} Relevant case study context
   */
  static async getCaseStudyForPainPoint(painPoint) {
    const caseStudies = await this.getCaseStudies();
    if (!caseStudies) return null;

    const painPointLower = painPoint?.toLowerCase() || '';

    // Map pain points to case studies
    const caseStudyMap = {
      'liquidity': 'UK PSP Treasury',
      'capital': 'UK PSP Treasury',
      'working capital': 'Multi-Corridor PSP',
      'treasury': 'UK PSP Treasury',
      'expansion': 'Singapore Fintech',
      'licensing': 'Singapore Fintech',
      'new markets': 'Singapore Fintech',
      'speed': 'Middle East Payment Operator',
      'settlement': 'Middle East Payment Operator',
      'real-time': 'Middle East Payment Operator',
      'cost': 'Multi-Corridor PSP',
      'fees': 'Multi-Corridor PSP',
      'margin': 'Multi-Corridor PSP'
    };

    // Find matching case study
    let bestMatch = 'Generic RTGS'; // default
    for (const [keyword, caseStudy] of Object.entries(caseStudyMap)) {
      if (painPointLower.includes(keyword)) {
        bestMatch = caseStudy;
        break;
      }
    }

    // Extract the relevant section
    const pattern = new RegExp(`## \\d+\\. ${bestMatch}.*?(?=## \\d+\\. |---|\$)`, 's');
    const match = caseStudies.match(pattern);

    return {
      painPoint,
      recommendedCaseStudy: bestMatch,
      content: match ? match[0] : null,
      fullCaseStudies: caseStudies
    };
  }

  /**
   * Clear knowledge cache (useful for testing or forced refresh)
   */
  static clearCache() {
    knowledgeCache.clear();
    logger.info('Knowledge cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  static getCacheStats() {
    return {
      entries: knowledgeCache.size,
      keys: Array.from(knowledgeCache.keys()),
      ttlMs: CACHE_TTL
    };
  }

  /**
   * List all available knowledge files
   * @returns {Promise<Object>} Available knowledge by category
   */
  static async listAvailableKnowledge() {
    const categories = ['company', 'competitive', 'industry', 'learnings'];
    const available = {};

    for (const category of categories) {
      const categoryPath = path.join(KNOWLEDGE_DIR, category);
      try {
        const files = await fs.readdir(categoryPath);
        available[category] = files
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''));
      } catch (error) {
        available[category] = [];
        if (error.code !== 'ENOENT') {
          logger.error('Error listing knowledge category', {
            category,
            error: error.message
          });
        }
      }
    }

    return available;
  }
}

export default KnowledgeService;
