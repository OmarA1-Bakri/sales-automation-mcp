/**
 * Outreach Worker - Sales Automation
 *
 * Handles outreach campaign management, lead enrollment, and engagement tracking.
 * Manages lemlist campaigns, multi-channel sequences, and reply monitoring.
 *
 * Key Features:
 * - Campaign creation and management
 * - Lead enrollment with personalization
 * - Multi-channel sequences (Email + LinkedIn)
 * - Reply monitoring and routing
 * - A/B testing and optimization
 * - Compliance (unsubscribe handling)
 */

// ARCH-004 FIX: Import structured logger
import { createLogger } from '../utils/logger.js';
import KnowledgeService from '../services/KnowledgeService.js';

const logger = createLogger('OutreachWorker');

export class OutreachWorker {
  constructor(lemlistClient, database) {
    this.lemlist = lemlistClient;
    this.database = database;

    // Outreach statistics
    this.stats = {
      campaignsCreated: 0,
      leadsEnrolled: 0,
      emailsSent: 0,
      linkedinSent: 0,
      repliesReceived: 0,
      errors: 0,
    };
  }

  // ==========================================================================
  // CAMPAIGN MANAGEMENT
  // ==========================================================================

  /**
   * Create a new outreach campaign
   * @param {Object} campaignData - Campaign configuration
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(campaignData) {
    const { name, emails, linkedinEnabled = true, settings = {} } = campaignData;

    try {
      logger.info(`[Outreach] Creating campaign: ${name}`);

      // Default settings
      const defaultSettings = {
        trackOpens: true,
        trackClicks: true,
        sendAsPlainText: false,
        stopOnReply: true,
        dailyLimit: 50,
        timeZone: 'UTC',
        sendingWindow: {
          start: '09:00',
          end: '17:00',
        },
      };

      const finalSettings = { ...defaultSettings, ...settings };

      // Create campaign via lemlist
      const campaign = await this.lemlist.createCampaign({
        name,
        emails,
        settings: finalSettings,
      });

      // Store campaign in database
      await this._storeCampaign(campaign);

      this.stats.campaignsCreated++;

      logger.info(`[Outreach] Campaign created: ${campaign.id}`);

      return {
        success: true,
        campaign,
      };
    } catch (error) {
      logger.error(`[Outreach] Failed to create campaign:`, error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get campaign details and stats
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign data
   */
  async getCampaign(campaignId) {
    try {
      const campaign = await this.lemlist.getCampaign(campaignId);
      const stats = await this.lemlist.getCampaignStats(campaignId);

      return {
        success: true,
        campaign: {
          ...campaign,
          stats,
        },
      };
    } catch (error) {
      logger.error(
        `[Outreach] Failed to get campaign ${campaignId}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all active campaigns
   * @returns {Promise<Array>} List of campaigns
   */
  async getActiveCampaigns() {
    try {
      const campaigns = await this.lemlist.getCampaigns({ status: 'active' });
      return campaigns;
    } catch (error) {
      logger.error('[Outreach] Failed to get campaigns:', error.message);
      return [];
    }
  }

  // ==========================================================================
  // LEAD ENROLLMENT
  // ==========================================================================

  /**
   * Enroll a lead in a campaign
   * @param {Object} lead - Lead data with personalization
   * @param {string} campaignId - Target campaign ID
   * @param {Object} options - Enrollment options
   * @returns {Promise<Object>} Enrollment result
   */
  async enrollLead(lead, campaignId, options = {}) {
    const {
      enrichLinkedIn = true,
      startImmediately = true,
      customVariables = {},
    } = options;

    const { email, firstName, lastName, companyName, intelligence } = lead;

    try {
      logger.info(`[Outreach] Enrolling ${email} in campaign ${campaignId}`);

      // Step 0: Load knowledge context for this persona (non-blocking enhancement)
      let knowledgeContext = {};
      try {
        const persona = lead.title?.toLowerCase().includes('cto') || lead.title?.toLowerCase().includes('tech') 
          ? 'tech_leader'
          : lead.title?.toLowerCase().includes('cfo') || lead.title?.toLowerCase().includes('finance')
            ? 'finance_leader'
            : 'executive';
        
        const industry = lead.company?.industry || lead.companyIndustry || 'payments';
        
        knowledgeContext = await KnowledgeService.getContextForPersona(persona, industry);
        logger.debug(`[Outreach] Loaded knowledge context for ${persona}/${industry}`);
      } catch (knowledgeError) {
        logger.warn(`[Outreach] Knowledge context unavailable: ${knowledgeError.message}`);
      }

      // Step 1: Prepare personalization variables (with knowledge enhancement)
      const variables = this._preparePersonalizationVariables(
        lead,
        intelligence,
        { ...customVariables, ...knowledgeContext }
      );

      // Step 2: Add lead to campaign
      const enrollment = await this.lemlist.addLead({
        campaignId,
        email,
        firstName,
        lastName,
        companyName,
        customFields: variables,
      });

      // Step 3: Enrich with LinkedIn (if enabled)
      if (enrichLinkedIn && enrollment.leadId) {
        try {
          await this.lemlist.enrichLeadWithLinkedIn(enrollment.leadId);
          logger.info(
            `[Outreach] LinkedIn enrichment requested for ${enrollment.leadId}`
          );
        } catch (error) {
          logger.warn(
            `[Outreach] LinkedIn enrichment failed for ${email}:`,
            error.message
          );
        }
      }

      // Step 4: Record enrollment
      await this._recordEnrollment(campaignId, email, enrollment.leadId);

      this.stats.leadsEnrolled++;

      return {
        success: true,
        leadId: enrollment.leadId,
        campaignId,
        variables,
      };
    } catch (error) {
      logger.error(
        `[Outreach] Failed to enroll ${email}:`,
        error.message
      );
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
        lead: { email, firstName, lastName },
      };
    }
  }

  /**
   * Batch enroll multiple leads
   * @param {Array} leads - Array of leads to enroll
   * @param {string} campaignId - Target campaign ID
   * @param {Object} options - Enrollment options
   * @returns {Promise<Object>} Batch enrollment results
   */
  async batchEnrollLeads(leads, campaignId, options = {}) {
    const { batchSize = 100, continueOnError = true } = options;

    logger.info(
      `[Outreach] Starting batch enrollment of ${leads.length} leads in campaign ${campaignId}`
    );

    const results = {
      total: leads.length,
      enrolled: [],
      failed: [],
    };

    // Process in batches
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      logger.info(
        `[Outreach] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leads.length / batchSize)}`
      );

      // Prepare batch for lemlist bulk API
      const bulkLeads = batch.map((lead) => ({
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName,
        customFields: this._preparePersonalizationVariables(
          lead,
          lead.intelligence,
          {}
        ),
      }));

      try {
        const batchResult = await this.lemlist.bulkAddLeads(campaignId, bulkLeads);

        for (const result of batchResult.results || []) {
          if (result.success) {
            results.enrolled.push({
              email: result.email,
              leadId: result.leadId,
            });
          } else {
            results.failed.push({
              email: result.email,
              error: result.error,
            });
          }
        }

        this.stats.leadsEnrolled += (batchResult.results || []).filter(
          (r) => r.success
        ).length;
      } catch (error) {
        logger.error('[Outreach] Batch enrollment error:', error.message);
        if (!continueOnError) break;
      }

      // Respect rate limits
      if (i + batchSize < leads.length) {
        await this._sleep(1000);
      }
    }

    logger.info(
      `[Outreach] Batch enrollment complete: ${results.enrolled.length}/${leads.length} enrolled`
    );

    return results;
  }

  // ==========================================================================
  // PERSONALIZATION
  // ==========================================================================

  /**
   * Prepare personalization variables from enrichment intelligence
   * @private
   */
  _preparePersonalizationVariables(lead, intelligence, customVariables) {
    const variables = {
      ...customVariables,
    };

    if (!intelligence) {
      return variables;
    }

    // Pain points
    if (intelligence.painHypotheses && intelligence.painHypotheses.length > 0) {
      const topPain = intelligence.painHypotheses[0];
      variables.pain_point = topPain?.pain || 'improving sales efficiency';
      variables.pain_reasoning = topPain?.reasoning || 'based on industry analysis';
    }

    // Personalization hooks
    if (
      intelligence.personalizationHooks &&
      intelligence.personalizationHooks.length > 0
    ) {
      const topHook = intelligence.personalizationHooks[0];
      variables.personalization_hook = topHook?.hook || 'your recent growth';
      variables.hook_usage = topHook?.usage || 'opening context';
    }

    // Why now trigger
    if (intelligence.whyNow) {
      variables.why_now = intelligence.whyNow.trigger;
      variables.urgency = intelligence.whyNow.urgency;
    }

    // Company data (if available)
    if (lead.company) {
      variables.company_industry = lead.company.industry;
      variables.company_employees = lead.company.employees;
      variables.company_funding = lead.company.fundingStage;

      if (lead.company.signals && lead.company.signals.length > 0) {
        const signal = lead.company.signals[0];
        variables.recent_signal = signal?.description || signal?.name || 'your company\'s momentum';
      }
    }

    return variables;
  }

  // ==========================================================================
  // REPLY MONITORING
  // ==========================================================================

  /**
   * Check for new replies across all campaigns
   * @returns {Promise<Object>} Reply summary
   */
  async checkForReplies() {
    try {
      logger.info('[Outreach] Checking for new replies...');

      const campaigns = await this.getActiveCampaigns();
      const allReplies = {
        positive: [],
        negative: [],
        neutral: [],
        total: 0,
      };

      for (const campaign of campaigns) {
        const leads = await this.lemlist.getLeads({
          campaignId: campaign.id,
          replied: true,
        });

        for (const lead of leads) {
          // Classify reply sentiment (simple keyword-based)
          const sentiment = this._classifyReplySentiment(lead.lastReply);

          allReplies[sentiment].push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            leadId: lead.id,
            email: lead.email,
            firstName: lead.firstName,
            lastName: lead.lastName,
            reply: lead.lastReply,
            repliedAt: lead.repliedAt,
          });

          allReplies.total++;
        }
      }

      this.stats.repliesReceived += allReplies.total;

      logger.info(
        `[Outreach] Found ${allReplies.total} replies (${allReplies.positive.length} positive, ${allReplies.negative.length} negative)`
      );

      return allReplies;
    } catch (error) {
      logger.error('[Outreach] Failed to check replies:', error.message);
      return {
        positive: [],
        negative: [],
        neutral: [],
        total: 0,
        error: error.message,
      };
    }
  }

  /**
   * Classify reply sentiment
   * @private
   */
  _classifyReplySentiment(replyText) {
    if (!replyText) return 'neutral';

    const text = replyText.toLowerCase();

    // Positive indicators
    const positiveKeywords = [
      'interested',
      'yes',
      'call',
      'meeting',
      'demo',
      'schedule',
      'tell me more',
      'sounds good',
      'let\'s talk',
    ];

    // Negative indicators
    const negativeKeywords = [
      'unsubscribe',
      'not interested',
      'no thank',
      'remove',
      'stop',
      'spam',
    ];

    if (positiveKeywords.some((keyword) => text.includes(keyword))) {
      return 'positive';
    }

    if (negativeKeywords.some((keyword) => text.includes(keyword))) {
      return 'negative';
    }

    return 'neutral';
  }

  // ==========================================================================
  // CAMPAIGN OPTIMIZATION
  // ==========================================================================

  /**
   * Analyze campaign performance and suggest optimizations
   * @param {string} campaignId - Campaign to analyze
   * @returns {Promise<Object>} Optimization suggestions
   */
  async analyzeCampaignPerformance(campaignId) {
    try {
      const stats = await this.lemlist.getCampaignStats(campaignId);

      const {
        sent = 0,
        opened = 0,
        clicked = 0,
        replied = 0,
        bounced = 0,
      } = stats;

      const openRate = sent > 0 ? opened / sent : 0;
      const clickRate = opened > 0 ? clicked / opened : 0;
      const replyRate = sent > 0 ? replied / sent : 0;
      const bounceRate = sent > 0 ? bounced / sent : 0;

      const suggestions = [];

      // Low open rate
      if (sent > 50 && openRate < 0.3) {
        suggestions.push({
          issue: 'Low open rate',
          current: `${(openRate * 100).toFixed(1)}%`,
          recommendation: 'Test new subject lines with more curiosity/urgency',
          priority: 'high',
        });
      }

      // Low reply rate
      if (sent > 100 && replyRate < 0.03) {
        suggestions.push({
          issue: 'Low reply rate',
          current: `${(replyRate * 100).toFixed(1)}%`,
          recommendation: 'Review email copy and call-to-action',
          priority: 'high',
        });
      }

      // High bounce rate
      if (sent > 20 && bounceRate > 0.05) {
        suggestions.push({
          issue: 'High bounce rate',
          current: `${(bounceRate * 100).toFixed(1)}%`,
          recommendation: 'Improve email verification in enrichment',
          priority: 'critical',
        });
      }

      // Good performance
      if (replyRate > 0.10) {
        suggestions.push({
          issue: 'Strong performance',
          current: `${(replyRate * 100).toFixed(1)}% reply rate`,
          recommendation: 'Scale up daily send volume',
          priority: 'low',
        });
      }

      return {
        success: true,
        campaignId,
        stats: {
          sent,
          openRate: (openRate * 100).toFixed(1) + '%',
          clickRate: (clickRate * 100).toFixed(1) + '%',
          replyRate: (replyRate * 100).toFixed(1) + '%',
          bounceRate: (bounceRate * 100).toFixed(1) + '%',
        },
        suggestions,
      };
    } catch (error) {
      logger.error(
        `[Outreach] Failed to analyze campaign ${campaignId}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // COMPLIANCE
  // ==========================================================================

  /**
   * Handle unsubscribe request
   * @param {string} email - Email to unsubscribe
   * @returns {Promise<Object>} Unsubscribe result
   */
  async handleUnsubscribe(email) {
    try {
      logger.info(`[Outreach] Processing unsubscribe for ${email}`);

      await this.lemlist.addToUnsubscribes(email);

      // Record in database
      await this._recordUnsubscribe(email);

      logger.info(`[Outreach] ${email} unsubscribed successfully`);

      return {
        success: true,
        email,
        unsubscribedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(
        `[Outreach] Failed to process unsubscribe for ${email}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if email is unsubscribed
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if unsubscribed
   */
  async isUnsubscribed(email) {
    try {
      const unsubscribes = await this.lemlist.getUnsubscribes();
      return unsubscribes.some((unsub) => unsub.email === email);
    } catch (error) {
      logger.error('[Outreach] Failed to check unsubscribe status:', error.message);
      return false;
    }
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  async _storeCampaign(campaign) {
    try {
      const stmt = this.database.db.prepare(`
        INSERT OR REPLACE INTO campaigns (id, name, status, settings, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        campaign.id,
        campaign.name,
        campaign.status || 'active',
        JSON.stringify(campaign.settings || {})
      );
    } catch (error) {
      logger.error('[Outreach] Failed to store campaign:', error.message);
      this.stats.errors = (this.stats.errors || 0) + 1;
      // SEC-004 FIX: Re-throw to prevent silent data loss
      throw new Error(`Failed to store campaign ${campaign.id}: ${error.message}`);
    }
  }

  async _recordEnrollment(campaignId, email, leadId) {
    try {
      const stmt = this.database.db.prepare(`
        INSERT INTO enrollments (campaign_id, email, lead_id, enrolled_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      stmt.run(campaignId, email, leadId);
    } catch (error) {
      logger.error('[Outreach] Failed to record enrollment:', error.message);
      this.stats.errors = (this.stats.errors || 0) + 1;
      // SEC-004 FIX: Re-throw to prevent silent data loss
      throw new Error(`Failed to record enrollment for ${email}: ${error.message}`);
    }
  }

  async _recordUnsubscribe(email) {
    try {
      const stmt = this.database.db.prepare(`
        INSERT INTO unsubscribes (email, unsubscribed_at)
        VALUES (?, datetime('now'))
      `);

      stmt.run(email);
    } catch (error) {
      logger.error('[Outreach] Failed to record unsubscribe:', error.message);
      this.stats.errors = (this.stats.errors || 0) + 1;
      // SEC-004 FIX: Re-throw - unsubscribe failures are critical for compliance
      throw new Error(`Failed to record unsubscribe for ${email}: ${error.message}`);
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get outreach statistics
   */
  getStats() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      campaignsCreated: 0,
      leadsEnrolled: 0,
      emailsSent: 0,
      linkedinSent: 0,
      repliesReceived: 0,
      errors: 0,
    };
  }
}

export default OutreachWorker;
