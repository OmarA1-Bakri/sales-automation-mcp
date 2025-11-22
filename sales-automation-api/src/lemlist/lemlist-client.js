/**
 * Lemlist API Client - LinkedIn Enrichment Focus
 * ONLY fetches real LinkedIn URLs from Lemlist's waterfall enrichment
 * NO pattern generation, NO email guessing - ONLY real data
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { createCircuitBreaker } from '../utils/circuit-breaker.js';

export class LemlistClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = 'https://api.lemlist.com/api';
    
    if (!this.apiKey) {
      throw new Error('LEMLIST_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: '',
        password: this.apiKey
      },
      timeout: 30000
    });

    // PHASE 3 FIX (P3.3): Configure retry logic with exponential backoff
    axiosRetry(this.client, {
      retries: 5,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors
        if (axiosRetry.isNetworkError(error)) return true;
        
        // Retry on rate limits (429)
        if (error.response?.status === 429) return true;
        
        // Retry on server errors (5xx)
        if (error.response?.status >= 500) return true;
        
        return false;
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn('[Lemlist Client] Retrying request', {
          attempt: retryCount,
          maxRetries: 5,
          url: requestConfig.url,
          error: error.message
        });
      }
    });

    // PHASE 3 FIX (P3.6): Wrap axios client with circuit breaker
    this.circuitBreaker = createCircuitBreaker(
      async (requestConfig) => {
        return await this.client.request(requestConfig);
      },
      {
        serviceName: 'lemlist',
        fallback: (requestConfig) => {
          console.warn('[Lemlist Circuit] Circuit open, service temporarily unavailable');
          throw new Error(
            'Lemlist API is temporarily unavailable. Please try again in a few moments.'
          );
        }
      }
    );
  }

  // PHASE 3 FIX (P3.6): Helper method to make circuit-protected API calls
  async _makeRequest(method, url, data = null, config = {}) {
    const requestConfig = {
      method,
      url,
      ...config
    };

    if (data) {
      if (method.toLowerCase() === 'get') {
        requestConfig.params = data;
      } else {
        requestConfig.data = data;
      }
    }

    return await this.circuitBreaker.fire(requestConfig);
  }

  // === CAMPAIGN MANAGEMENT (Required for lead creation) ===
  
  async getCampaigns(options = {}) {
    const { limit = 100, offset = 0 } = options;
    const response = await this.client.get('/campaigns', {
      params: { limit, offset }
    });
    return response.data;
  }

  async getCampaign(campaignId) {
    const response = await this._makeRequest('get', `/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(campaignData) {
    const response = await this._makeRequest('post', '/campaigns', campaignData);
    return response.data;
  }

  // === LEAD MANAGEMENT ===

  async getLeads(options = {}) {
    const { campaignId, limit = 100, offset = 0 } = options;
    const url = campaignId ? `/campaigns/${campaignId}/leads` : '/leads';
    const response = await this.client.get(url, { 
      params: { limit, offset }
    });
    return response.data;
  }

  async addLead(leadData) {
    const { campaignId, email, firstName, lastName, companyName } = leadData;
    
    const payload = {
      email,
      firstName,
      lastName,
      companyName
    };

    const response = await this._makeRequest('post', `/campaigns/${campaignId}/leads`, payload);
    return response.data;
  }

  async bulkAddLeads(campaignId, leads) {
    /**
     * Add multiple leads to a campaign at once
     * More efficient than adding leads one by one
     */
    
    console.error(`[Lemlist API] Bulk adding ${leads.length} leads to campaign ${campaignId}`);
    
    const validLeads = leads.filter(lead => lead.email && lead.firstName && lead.lastName);
    
    if (validLeads.length === 0) {
      return { error: 'No valid leads provided. Each lead needs email, firstName, and lastName.' };
    }

    const response = await this._makeRequest('post', `/campaigns/${campaignId}/leads`, validLeads);
    return {
      success: true,
      addedLeads: validLeads.length,
      skippedLeads: leads.length - validLeads.length,
      data: response.data
    };
  }

  async updateLead(leadId, updateData) {
    /**
     * Update lead information
     */
    const response = await this._makeRequest('patch', `/leads/${leadId}`, updateData);
    return response.data;
  }

  async deleteLead(leadId) {
    /**
     * Remove lead from campaign
     */
    const response = await this._makeRequest('delete', `/leads/${leadId}`);
    return { success: true, leadId, message: 'Lead deleted successfully' };
  }

  // === PEOPLE DATABASE SEARCH ===

  async searchPeople(filters = [], page = 1) {
    /**
     * Search Lemlist's people database with filters
     * Uses the correct /schema/people endpoint as shown in API documentation
     */
    
    console.error(`[Lemlist API] Searching people database with filters:`, filters);
    
    try {
      // Use the correct format from curl example
      const response = await this.client.request({
        method: 'GET',
        url: '/schema/people',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          filters,
          page
        }
      });
      
      if (response.data && response.data.schema) {
        console.error(`[Lemlist API] ✅ Found schema data with LinkedIn URL`);
        
        // Extract LinkedIn URLs from schema response
        const schema = response.data.schema;
        const linkedinUrl = schema.lead_linkedin_url;
        const linkedinShort = schema.linkedin_short;
        const companyLinkedInUrl = schema.experiences?.[0]?.company_linkedin_url;
        
        return {
          success: true,
          found: !!linkedinUrl,
          data: {
            leadId: schema.lead_id,
            fullName: schema.full_name,
            linkedinUrl: linkedinUrl,
            linkedinShort: linkedinShort,
            companyLinkedInUrl: companyLinkedInUrl,
            title: schema.title,
            location: schema.location,
            summary: schema.summary,
            fullSchema: schema
          },
          totalResults: 1
        };
      }
      
      return {
        success: true,
        found: false,
        data: response.data,
        totalResults: 0,
        message: 'No LinkedIn data found in schema response'
      };
      
    } catch (error) {
      console.error(`[Lemlist API] Database search error:`, error.response?.status, error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status
      };
    }
  }

  async searchPersonByName(firstName, lastName, companyDomain = null) {
    /**
     * Search for a specific person in Lemlist's database
     * Returns real LinkedIn URLs if available in database
     */
    
    const filters = [];
    
    // Add name filters if provided
    if (firstName) {
      filters.push({
        filterId: "firstName",
        in: [firstName],
        out: []
      });
    }
    
    if (lastName) {
      filters.push({
        filterId: "lastName", 
        in: [lastName],
        out: []
      });
    }
    
    if (companyDomain) {
      filters.push({
        filterId: "companyDomain",
        in: [companyDomain],
        out: []
      });
    }
    
    console.error(`[Lemlist API] Searching for ${firstName} ${lastName} at ${companyDomain}`);
    
    try {
      // Use GET with request body as shown in curl example
      const response = await this.client.request({
        method: 'GET',
        url: '/schema/people',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          filters,
          page: 1
        }
      });
      
      if (response.data && response.data.schema) {
        const schema = response.data.schema;
        const linkedinUrl = schema.lead_linkedin_url;
        
        return {
          success: true,
          found: !!linkedinUrl,
          linkedinUrl: linkedinUrl,
          linkedinShort: schema.linkedin_short,
          companyLinkedInUrl: schema.experiences?.[0]?.company_linkedin_url,
          fullData: schema,
          totalResults: 1,
          message: linkedinUrl ? `Found LinkedIn URL: ${linkedinUrl}` : 'Schema found but no LinkedIn URL'
        };
      }
      
      return {
        success: true,
        found: false,
        message: `No schema data found for ${firstName} ${lastName}`
      };
      
    } catch (error) {
      console.error(`[Lemlist API] People search error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // === LINKEDIN ENRICHMENT - THE MAIN FOCUS ===

  async enrichLeadWithLinkedIn(leadId) {
    /**
     * Enriches an existing lead with real LinkedIn URL
     * Uses Lemlist's waterfall enrichment to get actual profile URL
     * 
     * @param {string} leadId - The ID of the lead to enrich
     * @returns {object} Enrichment result with enrichmentId
     */
    
    console.error(`[Lemlist API] Starting LinkedIn enrichment for lead ${leadId}`);
    
    const response = await this.client.post(`/leads/${leadId}/enrich`, {}, {
      params: {
        linkedinEnrichment: true,
        findPhone: true
      }
    });
    
    return {
      enrichmentId: response.data.id,
      leadId,
      status: 'processing',
      message: 'LinkedIn enrichment started. Real profile URL will be available in lead_linkedin_url field.',
      timestamp: new Date().toISOString()
    };
  }

  async getEnrichedLeadData(leadId) {
    /**
     * Attempts to retrieve the enriched lead data with real LinkedIn URL
     * The lead_linkedin_url field contains the actual profile URL
     */
    
    try {
      // Check if lead exists directly
      const response = await this._makeRequest('get', `/leads/${leadId}`);
      
      if (response.data && response.data.lead_linkedin_url) {
        return {
          success: true,
          leadId,
          linkedinUrl: response.data.lead_linkedin_url,  // Real LinkedIn URL
          linkedinShort: response.data.linkedin_short,    // LinkedIn handle
          fullData: response.data
        };
      }
      
      return {
        success: false,
        leadId,
        message: 'Lead found but no LinkedIn URL yet. Enrichment may still be processing.'
      };
      
    } catch (error) {
      // Try to find lead in campaigns
      const campaigns = await this.getCampaigns({ limit: 10 });
      
      for (const campaign of campaigns) {
        try {
          const leads = await this.getLeads({ campaignId: campaign._id });
          if (leads && Array.isArray(leads)) {
            const foundLead = leads.find(lead => lead._id === leadId);
            
            if (foundLead && foundLead.lead_linkedin_url) {
              return {
                success: true,
                leadId,
                linkedinUrl: foundLead.lead_linkedin_url,  // Real LinkedIn URL
                linkedinShort: foundLead.linkedin_short,
                fullData: foundLead
              };
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return {
        success: false,
        leadId,
        error: 'Lead not found or enrichment not complete'
      };
    }
  }

  async searchAndEnrichPerson(firstName, lastName, companyDomain) {
    /**
     * Creates a lead and enriches it to get real LinkedIn URL
     * This is the main workflow for finding someone's LinkedIn
     * 
     * @returns {object} Lead ID and enrichment ID for tracking
     */
    
    if (!firstName || !lastName || !companyDomain) {
      return {
        error: 'firstName, lastName, and companyDomain are required'
      };
    }

    try {
      // Get a campaign to add the lead to
      const campaigns = await this.getCampaigns({ limit: 1 });
      if (!campaigns || campaigns.length === 0) {
        return { error: 'No campaigns available. Create a campaign first.' };
      }
      
      const campaignId = campaigns[0]._id;
      
      // Create the lead with a unique email to avoid duplicates
      // The email doesn't matter - enrichment will find the real LinkedIn
      const timestamp = Date.now();
      const tempEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@${companyDomain}`;
      
      console.error(`[Lemlist API] Creating lead for ${firstName} ${lastName} at ${companyDomain}`);
      
      const lead = await this.addLead({
        campaignId,
        email: tempEmail,
        firstName,
        lastName,
        companyName: companyDomain.split('.')[0]
      });
      
      // Start enrichment immediately
      const enrichment = await this.enrichLeadWithLinkedIn(lead._id);
      
      return {
        success: true,
        leadId: lead._id,
        enrichmentId: enrichment.enrichmentId,
        message: 'Lead created and enrichment started. Check back for real LinkedIn URL.',
        checkDataWith: `getEnrichedLeadData('${lead._id}')`
      };
      
    } catch (error) {
      return {
        error: error.message,
        note: 'Could not create lead or start enrichment'
      };
    }
  }

  // === ADVANCED SEARCH & ANALYTICS ===

  async searchLeadsAdvanced(filters = {}) {
    /**
     * Advanced lead search with filters
     * Useful for finding leads matching specific criteria
     */
    
    const { campaignId, status, country, industry, company, limit = 100, offset = 0 } = filters;
    
    let url = '/leads';
    if (campaignId) {
      url = `/campaigns/${campaignId}/leads`;
    }
    
    const params = { limit, offset };
    
    // Add filters if provided
    if (status) params.status = status;
    if (country) params.country = country;
    if (industry) params.industry = industry;
    if (company) params.company = company;
    
    const response = await this._makeRequest('get', url, params);
    
    return {
      success: true,
      leads: response.data,
      totalFound: response.data.length,
      filters: filters
    };
  }

  async getCampaignStats(campaignId) {
    /**
     * Get detailed campaign statistics
     * Essential for tracking lead generation performance
     */
    
    console.error(`[Lemlist API] Getting stats for campaign ${campaignId}`);
    
    try {
      const response = await this._makeRequest('get', `/campaigns/${campaignId}/stats`);
      
      return {
        success: true,
        campaignId,
        stats: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // If stats endpoint doesn't exist, calculate basic stats from leads
      try {
        const leads = await this.getLeads({ campaignId, limit: 1000 });
        
        const stats = {
          totalLeads: leads.length,
          contactedLeads: leads.filter(lead => lead.contacted).length,
          repliedLeads: leads.filter(lead => lead.replied).length,
          bouncedLeads: leads.filter(lead => lead.bounced).length,
          enrichedLeads: leads.filter(lead => lead.lead_linkedin_url).length
        };
        
        return {
          success: true,
          campaignId,
          stats,
          calculated: true,
          message: 'Stats calculated from lead data'
        };
      } catch (calcError) {
        return {
          success: false,
          error: 'Could not retrieve campaign statistics',
          details: error.message
        };
      }
    }
  }

  async exportLeads(campaignId, options = {}) {
    /**
     * Export leads from campaign for analysis
     * Perfect for lead qualification and analysis
     */
    
    const { format = 'json', includeEnrichment = true, limit = 1000 } = options;
    
    console.error(`[Lemlist API] Exporting leads from campaign ${campaignId}`);
    
    try {
      const leads = await this.getLeads({ campaignId, limit });
      
      const exportData = leads.map(lead => {
        const baseData = {
          id: lead._id,
          email: lead.email,
          firstName: lead.firstName,
          lastName: lead.lastName,
          companyName: lead.companyName,
          status: lead.status,
          contacted: lead.contacted,
          replied: lead.replied
        };
        
        if (includeEnrichment) {
          baseData.linkedinUrl = lead.lead_linkedin_url;
          baseData.linkedinShort = lead.linkedin_short;
          baseData.enriched = !!lead.lead_linkedin_url;
        }
        
        return baseData;
      });
      
      return {
        success: true,
        campaignId,
        format,
        totalLeads: exportData.length,
        exportedAt: new Date().toISOString(),
        data: exportData
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to export leads',
        details: error.message
      };
    }
  }

  async getMultiCampaignStats(campaignIds, options = {}) {
    /**
     * Get statistics for multiple campaigns
     * Great for comparing lead generation performance
     */
    
    const results = {};
    
    for (const campaignId of campaignIds) {
      try {
        const stats = await this.getCampaignStats(campaignId);
        results[campaignId] = stats;
      } catch (error) {
        results[campaignId] = {
          success: false,
          error: error.message
        };
      }
    }
    
    return {
      success: true,
      totalCampaigns: campaignIds.length,
      results,
      timestamp: new Date().toISOString()
    };
  }

  // === UTILITY METHODS ===

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async healthCheck() {
    try {
      const campaigns = await this.getCampaigns({ limit: 1 });
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        apiConnection: 'active'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}