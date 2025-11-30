/**
 * Lemlist Client - Sales Automation Integration
 *
 * This client provides simplified access to Lemlist API for sales automation workflows.
 * It wraps the comprehensive Lemlist MCP client to provide focused methods needed
 * for lead generation, enrichment, and outreach automation.
 *
 * Key Features:
 * - Campaign management (create, update, get stats)
 * - Lead enrollment (single and bulk)
 * - LinkedIn enrichment via Lemlist's waterfall enrichment
 * - Activity tracking and analytics
 * - Multi-channel sequences (email + LinkedIn)
 */

import { LemlistClient as LemlistAPIClient } from '../lemlist/lemlist-client.js';
import { createLogger } from '../utils/logger.js';

export class LemlistClient {
  constructor(config = {}) {
    const apiKey = config.apiKey || process.env.LEMLIST_API_KEY;

    if (!apiKey) {
      throw new Error('LEMLIST_API_KEY is required for Lemlist integration');
    }

    // Initialize the full Lemlist API client
    this.client = new LemlistAPIClient({ apiKey });

    this.apiKey = apiKey;
    this.defaultCampaignId = config.defaultCampaignId || null;

    // SECURITY FIX: Phase 2, T2.4 - Use secure logger with PII redaction
    this.logger = createLogger('LemlistClient');
  }

  // ============================================================================
  // CAMPAIGN MANAGEMENT
  // ============================================================================

  /**
   * Get all campaigns with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of campaigns
   */
  async getCampaigns(options = {}) {
    try {
      const campaigns = await this.client.getCampaigns(options);
      return {
        success: true,
        campaigns: campaigns || [],
        count: campaigns?.length || 0
      };
    } catch (error) {
      return this._handleError('getCampaigns', error);
    }
  }

  /**
   * Get campaign by ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign details
   */
  async getCampaign(campaignId) {
    try {
      const campaign = await this.client.getCampaign(campaignId);
      return {
        success: true,
        campaign
      };
    } catch (error) {
      return this._handleError('getCampaign', error);
    }
  }

  /**
   * Create a new campaign with email sequence
   * @param {Object} campaignData - Campaign configuration
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(campaignData) {
    try {
      const { name, emails, settings = {} } = campaignData;

      if (!name) {
        throw new Error('Campaign name is required');
      }

      const campaign = await this.client.createCampaign({
        name,
        emails: emails || [],
        settings: {
          trackOpens: settings.trackOpens !== false,
          trackClicks: settings.trackClicks !== false,
          ...settings
        }
      });

      return {
        success: true,
        campaign,
        campaignId: campaign._id || campaign.id
      };
    } catch (error) {
      return this._handleError('createCampaign', error);
    }
  }

  /**
   * Get campaign statistics
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign stats
   */
  async getCampaignStats(campaignId) {
    try {
      const stats = await this.client.getCampaignStats(campaignId);
      return {
        success: true,
        ...stats
      };
    } catch (error) {
      return this._handleError('getCampaignStats', error);
    }
  }

  // ============================================================================
  // LEAD MANAGEMENT
  // ============================================================================

  /**
   * Add a single lead to a campaign
   * @param {Object} leadData - Lead information
   * @returns {Promise<Object>} Created lead
   */
  async addLead(leadData) {
    try {
      const { campaignId, email, firstName, lastName, companyName, customFields } = leadData;

      if (!campaignId || !email) {
        throw new Error('campaignId and email are required');
      }

      const lead = await this.client.addLead({
        campaignId,
        email,
        firstName,
        lastName,
        companyName,
        ...customFields
      });

      return {
        success: true,
        lead,
        leadId: lead._id || lead.id
      };
    } catch (error) {
      return this._handleError('addLead', error);
    }
  }

  /**
   * Add multiple leads to a campaign (bulk operation)
   * @param {string} campaignId - Campaign ID
   * @param {Array} leads - Array of lead objects
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkAddLeads(campaignId, leads) {
    try {
      if (!campaignId || !Array.isArray(leads) || leads.length === 0) {
        throw new Error('campaignId and non-empty leads array are required');
      }

      const result = await this.client.bulkAddLeads(campaignId, leads);

      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('bulkAddLeads', error);
    }
  }

  /**
   * Get leads from a campaign
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of leads
   */
  async getLeads(options = {}) {
    try {
      const leads = await this.client.getLeads(options);
      return {
        success: true,
        leads: leads || [],
        count: leads?.length || 0
      };
    } catch (error) {
      return this._handleError('getLeads', error);
    }
  }

  /**
   * Update lead information
   * @param {string} leadId - Lead ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated lead
   */
  async updateLead(leadId, updateData) {
    try {
      const lead = await this.client.updateLead(leadId, updateData);
      return {
        success: true,
        lead
      };
    } catch (error) {
      return this._handleError('updateLead', error);
    }
  }

  /**
   * Remove lead from campaign
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteLead(leadId) {
    try {
      const result = await this.client.deleteLead(leadId);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('deleteLead', error);
    }
  }

  // ============================================================================
  // LINKEDIN ENRICHMENT
  // ============================================================================

  /**
   * Enrich a lead with real LinkedIn URL via Lemlist's waterfall enrichment
   * @param {string} leadId - Lead ID to enrich
   * @returns {Promise<Object>} Enrichment result
   */
  async enrichLeadWithLinkedIn(leadId) {
    try {
      const result = await this.client.enrichLeadWithLinkedIn(leadId);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('enrichLeadWithLinkedIn', error);
    }
  }

  /**
   * Get enriched lead data including LinkedIn URL
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} Enriched lead data
   */
  async getEnrichedLeadData(leadId) {
    try {
      const result = await this.client.getEnrichedLeadData(leadId);
      return result;
    } catch (error) {
      return this._handleError('getEnrichedLeadData', error);
    }
  }

  /**
   * Search for a person and enrich with LinkedIn URL
   * @param {string} firstName - First name
   * @param {string} lastName - Last name
   * @param {string} companyDomain - Company domain
   * @returns {Promise<Object>} Search and enrichment result
   */
  async searchAndEnrichPerson(firstName, lastName, companyDomain) {
    try {
      const result = await this.client.searchAndEnrichPerson(firstName, lastName, companyDomain);
      return result;
    } catch (error) {
      return this._handleError('searchAndEnrichPerson', error);
    }
  }

  // ============================================================================
  // ACTIVITIES & ANALYTICS
  // ============================================================================

  /**
   * Get campaign activities (opens, clicks, replies, etc.)
   * @param {Object} options - Activity query options
   * @returns {Promise<Array>} Array of activities
   */
  async getActivities(options = {}) {
    try {
      const activities = await this.client.getActivities(options);
      return {
        success: true,
        activities: activities || [],
        count: activities?.length || 0
      };
    } catch (error) {
      return this._handleError('getActivities', error);
    }
  }

  /**
   * Export leads from a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported leads
   */
  async exportLeads(campaignId, options = {}) {
    try {
      const result = await this.client.exportLeads(campaignId, options);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('exportLeads', error);
    }
  }

  // ============================================================================
  // UNSUBSCRIBE MANAGEMENT
  // ============================================================================

  /**
   * Get all unsubscribed emails
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of unsubscribed emails
   */
  async getUnsubscribes(options = {}) {
    try {
      const unsubscribes = await this.client.getUnsubscribes(options);
      return {
        success: true,
        unsubscribes: unsubscribes || [],
        count: unsubscribes?.length || 0
      };
    } catch (error) {
      return this._handleError('getUnsubscribes', error);
    }
  }

  /**
   * Add email to unsubscribe list (compliance)
   * @param {string} email - Email address
   * @returns {Promise<Object>} Result
   */
  async addToUnsubscribes(email) {
    try {
      const result = await this.client.addToUnsubscribes(email);
      return {
        success: true,
        email,
        message: 'Email added to unsubscribe list'
      };
    } catch (error) {
      return this._handleError('addToUnsubscribes', error);
    }
  }

  /**
   * Unsubscribe lead from specific campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} Result
   */
  async unsubscribeFromCampaign(campaignId, leadId) {
    try {
      const result = await this.client.unsubscribeFromCampaign(campaignId, leadId);
      return {
        success: true,
        campaignId,
        leadId,
        message: 'Lead unsubscribed from campaign'
      };
    } catch (error) {
      return this._handleError('unsubscribeFromCampaign', error);
    }
  }

  // ============================================================================
  // HIGH-LEVEL WORKFLOWS
  // ============================================================================

  /**
   * Create complete campaign with leads in one operation
   * @param {Object} config - Campaign configuration
   * @returns {Promise<Object>} Complete campaign result
   */
  async createCompleteCampaign(config) {
    try {
      const { campaignName, emailSequence, leads, settings } = config;

      if (!campaignName || !emailSequence) {
        throw new Error('campaignName and emailSequence are required');
      }

      const result = await this.client.createCompleteCampaign({
        campaignName,
        emailSequence,
        leads: leads || [],
        settings: settings || {}
      });

      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('createCompleteCampaign', error);
    }
  }

  /**
   * Validate lead data before import
   * @param {Array} leads - Array of leads to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateLeadData(leads) {
    try {
      const result = await this.client.validateLeadData(leads);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('validateLeadData', error);
    }
  }

  // ============================================================================
  // DYNAMIC RESPONSE (ConversationalResponder Integration)
  // ============================================================================

  /**
   * Send a reply to an existing conversation thread
   * Used by ConversationalResponder for dynamic AI responses
   * 
   * Note: Lemlist's API has limited direct reply support. This method attempts
   * to use the best available approach:
   * 1. Manual activity creation (email thread continuation)
   * 2. LinkedIn message send (for LinkedIn campaigns)
   * 3. Fallback notification for manual handling
   * 
   * @param {string} leadEmail - Lead's email address
   * @param {string} campaignId - Campaign ID
   * @param {string} messageContent - Reply message content
   * @param {object} options - Additional options
   * @returns {Promise<object>} Send result
   */
  async sendReply(leadEmail, campaignId, messageContent, options = {}) {
    const { channel = 'email', threadId = null, subject = null } = options;
    
    try {
      this.logger.info('Sending reply via Lemlist', { 
        leadEmail, 
        campaignId, 
        channel,
        contentLength: messageContent.length 
      });

      // Get lead info to find the lead ID
      const leadsResult = await this.client.getLeads(campaignId);
      const lead = leadsResult?.find?.(l => l.email === leadEmail);
      
      if (!lead) {
        this.logger.warn('Lead not found in campaign, creating activity without lead link', { leadEmail, campaignId });
      }

      const leadId = lead?._id || lead?.id;

      if (channel === 'linkedin') {
        // For LinkedIn, we use Lemlist's LinkedIn integration
        // This triggers the next LinkedIn step or sends a manual message
        return await this._sendLinkedInReply(leadId, campaignId, messageContent);
      } else {
        // For email, create a manual activity/note and optionally trigger send
        return await this._sendEmailReply(leadId, campaignId, leadEmail, messageContent, { subject, threadId });
      }
    } catch (error) {
      this.logger.error('Failed to send reply', { error: error.message, leadEmail, campaignId });
      return this._handleError('sendReply', error);
    }
  }

  /**
   * Send email reply (internal helper)
   * @private
   */
  async _sendEmailReply(leadId, campaignId, leadEmail, content, options = {}) {
    const { subject, threadId } = options;
    
    try {
      // Lemlist approach: Update lead with a note and trigger activity
      // The ideal is to use Lemlist's manual email feature if available
      
      // Option 1: Try to use Lemlist's hooks API for manual emails
      // POST /api/hooks/{hookId} - if a webhook is configured for replies
      
      // Option 2: Create an activity record (logs the response)
      // Note: This may not actually send the email depending on Lemlist setup
      
      // For now, we'll update the lead with the response content
      // and return info for potential direct email fallback
      
      if (leadId) {
        // Add response as a note/custom field for tracking
        await this.client.updateLead({
          campaignId,
          leadId,
          customFields: {
            lastAIResponse: content.substring(0, 500),
            lastAIResponseAt: new Date().toISOString()
          }
        });
      }

      // Return result with info needed for fallback direct send
      return {
        success: true,
        sent: false, // Lemlist doesn't have direct reply API - needs fallback
        method: 'lemlist_activity_logged',
        message: 'Response logged to Lemlist. Direct email send may be needed.',
        leadEmail,
        content,
        subject,
        needsDirectSend: true // Signal to ConversationalResponder to use direct email
      };
    } catch (error) {
      this.logger.error('Email reply failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send LinkedIn reply (internal helper)
   * @private
   */
  async _sendLinkedInReply(leadId, campaignId, content) {
    try {
      // Lemlist's LinkedIn integration allows sending messages through sequences
      // For manual replies outside sequence, we may need to:
      // 1. Use Lemlist's LinkedIn message step
      // 2. Fall back to manual notification

      if (leadId) {
        // Update lead with response for tracking
        await this.client.updateLead({
          campaignId,
          leadId,
          customFields: {
            lastLinkedInResponse: content.substring(0, 500),
            lastLinkedInResponseAt: new Date().toISOString()
          }
        });
      }

      return {
        success: true,
        sent: false,
        method: 'linkedin_activity_logged',
        message: 'LinkedIn response logged. Manual send may be needed via Lemlist UI.',
        needsManualAction: true
      };
    } catch (error) {
      this.logger.error('LinkedIn reply failed', { error: error.message });
      throw error;
    }
  }

  // ============================================================================
  // UTILITY & HEALTH
  // ============================================================================

  /**
   * Check Lemlist API connection and health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const result = await this.client.healthCheck();
      return {
        success: true,
        status: 'healthy',
        ...result
      };
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get current rate limit status
   * @returns {Promise<Object>} Rate limit info
   */
  async getRateLimitStatus() {
    try {
      const result = await this.client.getRateLimitStatus();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return this._handleError('getRateLimitStatus', error);
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  _handleError(method, error) {
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error',
      method,
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      errorResponse.statusCode = error.response.status;
      errorResponse.statusText = error.response.statusText;
      errorResponse.details = error.response.data;
    }

    // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
    this.logger.error(`${method} failed`, errorResponse);

    return errorResponse;
  }
}

// Export for use in sales automation workflows
export default LemlistClient;
