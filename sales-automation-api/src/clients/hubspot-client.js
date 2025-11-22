/**
 * HubSpot Client - Sales Automation Integration
 *
 * This client provides simplified access to HubSpot CRM API for sales automation workflows.
 * It wraps HubSpot API v3 endpoints with focused methods needed for lead generation,
 * enrichment, and CRM management.
 *
 * Key Features:
 * - Contact management (create, update, search, merge, deduplicate)
 * - Company management (create, update, search, associate)
 * - Deal management (create, update, pipeline progression)
 * - Activity logging (notes, tasks, emails, calls, meetings)
 * - Association management (link contacts to companies/deals)
 * - Lifecycle stage management (automated progression)
 * - Timeline events (custom activities)
 *
 * Note: This plugin includes a separate HubSpot MCP server (100+ tools) accessible via
 * the 'hubspot' MCP server. This client is for simplified workflow integration.
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { createLogger } from '../utils/logger.js';
import { createCircuitBreaker } from '../utils/circuit-breaker.js';

export class HubSpotClient {
  constructor(config = {}) {
    const apiKey = config.apiKey || process.env.HUBSPOT_API_TOKEN || process.env.HUBSPOT_API_KEY;

    if (!apiKey) {
      throw new Error('HUBSPOT_API_TOKEN is required for HubSpot integration');
    }

    this.apiKey = apiKey;
    this.clientSecret = config.clientSecret || process.env.HUBSPOT_CLIENT_SECRET;
    this.baseURL = 'https://api.hubapi.com';

    // SECURITY FIX: Phase 2, T2.4 - Use secure logger with PII redaction
    this.logger = createLogger('HubSpotClient');

    // Create axios client with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // PHASE 3 FIX (P3.3): Configure retry logic with exponential backoff
    axiosRetry(this.client, {
      retries: 5, // Maximum retry attempts
      retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s, 8s, 16s
      retryCondition: (error) => {
        // Retry on network errors
        if (axiosRetry.isNetworkError(error)) {
          this.logger.warn('Network error detected, will retry', {
            attempt: error.config['axios-retry']?.retryCount || 0,
            error: error.message
          });
          return true;
        }

        // Retry on rate limits (429)
        if (error.response?.status === 429) {
          this.logger.warn('Rate limit hit, will retry', {
            attempt: error.config['axios-retry']?.retryCount || 0,
            retryAfter: error.response.headers['retry-after']
          });
          return true;
        }

        // Retry on server errors (5xx)
        if (error.response?.status >= 500) {
          this.logger.warn('Server error, will retry', {
            attempt: error.config['axios-retry']?.retryCount || 0,
            status: error.response.status
          });
          return true;
        }

        return false;
      },
      onRetry: (retryCount, error, requestConfig) => {
        this.logger.warn('Retrying HubSpot request', {
          attempt: retryCount,
          maxRetries: 5,
          url: requestConfig.url,
          method: requestConfig.method,
          error: error.message
        });
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this._handleAxiosError(error)
    );

    // PHASE 3 FIX (P3.6): Wrap axios client with circuit breaker
    // Circuit Breaker wraps retry logic: CB → Axios (with retry) → HTTP
    this.circuitBreaker = createCircuitBreaker(
      async (requestConfig) => {
        // This function contains the axios call with retry logic
        return await this.client.request(requestConfig);
      },
      {
        serviceName: 'hubspot',
        fallback: (requestConfig) => {
          // Graceful fallback when circuit is open
          this.logger.warn('HubSpot circuit open, returning error response');
          throw new Error(
            'HubSpot API is temporarily unavailable. Please try again in a few moments.'
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

  // ============================================================================
  // CONTACT MANAGEMENT
  // ============================================================================

  /**
   * Create a new contact in HubSpot
   * @param {Object} contactData - Contact properties
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    try {
      const { email, firstName, lastName, ...otherProperties } = contactData;

      if (!email) {
        throw new Error('Email is required to create a contact');
      }

      // PHASE 3 FIX (P3.6): Use circuit breaker for API calls
      const response = await this._makeRequest('post', '/crm/v3/objects/contacts', {
        properties: {
          email,
          firstname: firstName || contactData.firstname,
          lastname: lastName || contactData.lastname,
          ...otherProperties,
        },
      });

      return {
        success: true,
        contact: response.data,
        contactId: response.data.id,
      };
    } catch (error) {
      return this._handleError('createContact', error);
    }
  }

  /**
   * Update an existing contact
   * @param {string} contactId - Contact ID
   * @param {Object} properties - Properties to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, properties) {
    try {
      const response = await this.client.patch(
        `/crm/v3/objects/contacts/${contactId}`,
        { properties }
      );

      return {
        success: true,
        contact: response.data,
      };
    } catch (error) {
      return this._handleError('updateContact', error);
    }
  }

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @param {Array} properties - Properties to retrieve
   * @returns {Promise<Object>} Contact details
   */
  async getContact(contactId, properties = []) {
    try {
      const params = properties.length > 0 ? { properties: properties.join(',') } : {};

      const response = await this.client.get(
        `/crm/v3/objects/contacts/${contactId}`,
        { params }
      );

      return {
        success: true,
        contact: response.data,
      };
    } catch (error) {
      return this._handleError('getContact', error);
    }
  }

  /**
   * Search contacts with filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchContacts(searchParams) {
    try {
      const { filterGroups, properties, limit = 100, after } = searchParams;

      const response = await this.client.post('/crm/v3/objects/contacts/search', {
        filterGroups: filterGroups || [],
        properties: properties || [],
        limit,
        after,
      });

      return {
        success: true,
        contacts: response.data.results || [],
        total: response.data.total || 0,
        paging: response.data.paging,
      };
    } catch (error) {
      return this._handleError('searchContacts', error);
    }
  }

  /**
   * Find contact by email
   * @param {string} email - Email address
   * @returns {Promise<Object>} Contact or null
   */
  async findContactByEmail(email) {
    try {
      const result = await this.searchContacts({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        limit: 1,
      });

      if (result.success && result.contacts.length > 0) {
        return {
          success: true,
          contact: result.contacts[0],
          found: true,
        };
      }

      return {
        success: true,
        contact: null,
        found: false,
      };
    } catch (error) {
      return this._handleError('findContactByEmail', error);
    }
  }

  /**
   * Merge duplicate contacts
   * @param {string} primaryContactId - Primary contact to keep
   * @param {string} secondaryContactId - Contact to merge and delete
   * @returns {Promise<Object>} Merge result
   */
  async mergeContacts(primaryContactId, secondaryContactId) {
    try {
      const response = await this.client.post('/crm/v3/objects/contacts/merge', {
        primaryObjectId: primaryContactId,
        objectIdToMerge: secondaryContactId,
      });

      return {
        success: true,
        message: 'Contacts merged successfully',
        result: response.data,
      };
    } catch (error) {
      return this._handleError('mergeContacts', error);
    }
  }

  /**
   * Batch create or update contacts
   * @param {Array} contacts - Array of contact objects
   * @returns {Promise<Object>} Batch operation result
   */
  async batchUpsertContacts(contacts) {
    try {
      const inputs = contacts.map((contact) => ({
        properties: contact,
        idProperty: 'email', // Use email as unique identifier
      }));

      const response = await this.client.post(
        '/crm/v3/objects/contacts/batch/upsert',
        { inputs }
      );

      return {
        success: true,
        results: response.data.results || [],
        count: response.data.results?.length || 0,
      };
    } catch (error) {
      return this._handleError('batchUpsertContacts', error);
    }
  }

  // ============================================================================
  // COMPANY MANAGEMENT
  // ============================================================================

  /**
   * Create a new company
   * @param {Object} companyData - Company properties
   * @returns {Promise<Object>} Created company
   */
  async createCompany(companyData) {
    try {
      const response = await this.client.post('/crm/v3/objects/companies', {
        properties: companyData,
      });

      return {
        success: true,
        company: response.data,
        companyId: response.data.id,
      };
    } catch (error) {
      return this._handleError('createCompany', error);
    }
  }

  /**
   * Update existing company
   * @param {string} companyId - Company ID
   * @param {Object} properties - Properties to update
   * @returns {Promise<Object>} Updated company
   */
  async updateCompany(companyId, properties) {
    try {
      const response = await this.client.patch(
        `/crm/v3/objects/companies/${companyId}`,
        { properties }
      );

      return {
        success: true,
        company: response.data,
      };
    } catch (error) {
      return this._handleError('updateCompany', error);
    }
  }

  /**
   * Search companies
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchCompanies(searchParams) {
    try {
      const { filterGroups, properties, limit = 100, after } = searchParams;

      const response = await this.client.post('/crm/v3/objects/companies/search', {
        filterGroups: filterGroups || [],
        properties: properties || [],
        limit,
        after,
      });

      return {
        success: true,
        companies: response.data.results || [],
        total: response.data.total || 0,
        paging: response.data.paging,
      };
    } catch (error) {
      return this._handleError('searchCompanies', error);
    }
  }

  /**
   * Find company by domain
   * @param {string} domain - Company domain
   * @returns {Promise<Object>} Company or null
   */
  async findCompanyByDomain(domain) {
    try {
      const result = await this.searchCompanies({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'domain',
                operator: 'EQ',
                value: domain,
              },
            ],
          },
        ],
        limit: 1,
      });

      if (result.success && result.companies.length > 0) {
        return {
          success: true,
          company: result.companies[0],
          found: true,
        };
      }

      return {
        success: true,
        company: null,
        found: false,
      };
    } catch (error) {
      return this._handleError('findCompanyByDomain', error);
    }
  }

  // ============================================================================
  // DEAL MANAGEMENT
  // ============================================================================

  /**
   * Create a new deal
   * @param {Object} dealData - Deal properties
   * @returns {Promise<Object>} Created deal
   */
  async createDeal(dealData) {
    try {
      const response = await this.client.post('/crm/v3/objects/deals', {
        properties: dealData,
      });

      return {
        success: true,
        deal: response.data,
        dealId: response.data.id,
      };
    } catch (error) {
      return this._handleError('createDeal', error);
    }
  }

  /**
   * Update deal
   * @param {string} dealId - Deal ID
   * @param {Object} properties - Properties to update
   * @returns {Promise<Object>} Updated deal
   */
  async updateDeal(dealId, properties) {
    try {
      const response = await this.client.patch(
        `/crm/v3/objects/deals/${dealId}`,
        { properties }
      );

      return {
        success: true,
        deal: response.data,
      };
    } catch (error) {
      return this._handleError('updateDeal', error);
    }
  }

  // ============================================================================
  // ASSOCIATIONS
  // ============================================================================

  /**
   * Associate contact with company
   * @param {string} contactId - Contact ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Association result
   */
  async associateContactToCompany(contactId, companyId) {
    try {
      const response = await this.client.put(
        `/crm/v4/objects/contacts/${contactId}/associations/companies/${companyId}`,
        [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 279, // Contact to Company association type
          },
        ]
      );

      return {
        success: true,
        message: 'Contact associated with company',
        result: response.data,
      };
    } catch (error) {
      return this._handleError('associateContactToCompany', error);
    }
  }

  /**
   * Associate contact with deal
   * @param {string} contactId - Contact ID
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>} Association result
   */
  async associateContactToDeal(contactId, dealId) {
    try {
      const response = await this.client.put(
        `/crm/v4/objects/contacts/${contactId}/associations/deals/${dealId}`,
        [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3, // Contact to Deal association type
          },
        ]
      );

      return {
        success: true,
        message: 'Contact associated with deal',
        result: response.data,
      };
    } catch (error) {
      return this._handleError('associateContactToDeal', error);
    }
  }

  /**
   * Get contact's associations
   * @param {string} contactId - Contact ID
   * @param {string} toObjectType - Type of associated objects (companies, deals, etc.)
   * @returns {Promise<Object>} Associated objects
   */
  async getContactAssociations(contactId, toObjectType) {
    try {
      const response = await this.client.get(
        `/crm/v4/objects/contacts/${contactId}/associations/${toObjectType}`
      );

      return {
        success: true,
        associations: response.data.results || [],
        count: response.data.results?.length || 0,
      };
    } catch (error) {
      return this._handleError('getContactAssociations', error);
    }
  }

  // ============================================================================
  // ACTIVITY LOGGING
  // ============================================================================

  /**
   * Create a note on a contact/company/deal
   * @param {Object} noteData - Note properties
   * @returns {Promise<Object>} Created note
   */
  async createNote(noteData) {
    try {
      const { body, ownerId, associatedObjectType, associatedObjectId } = noteData;

      const response = await this.client.post('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: body,
          hubspot_owner_id: ownerId,
        },
        associations: associatedObjectId
          ? [
              {
                to: { id: associatedObjectId },
                types: [
                  {
                    associationCategory: 'HUBSPOT_DEFINED',
                    associationTypeId: this._getNoteAssociationType(associatedObjectType),
                  },
                ],
              },
            ]
          : [],
      });

      return {
        success: true,
        note: response.data,
        noteId: response.data.id,
      };
    } catch (error) {
      return this._handleError('createNote', error);
    }
  }

  /**
   * Create a task
   * @param {Object} taskData - Task properties
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    try {
      const { subject, body, status, priority, dueDate, ownerId, associatedObjectType, associatedObjectId } =
        taskData;

      const response = await this.client.post('/crm/v3/objects/tasks', {
        properties: {
          hs_task_subject: subject,
          hs_task_body: body,
          hs_task_status: status || 'NOT_STARTED',
          hs_task_priority: priority || 'MEDIUM',
          hs_timestamp: dueDate,
          hubspot_owner_id: ownerId,
        },
        associations: associatedObjectId
          ? [
              {
                to: { id: associatedObjectId },
                types: [
                  {
                    associationCategory: 'HUBSPOT_DEFINED',
                    associationTypeId: this._getTaskAssociationType(associatedObjectType),
                  },
                ],
              },
            ]
          : [],
      });

      return {
        success: true,
        task: response.data,
        taskId: response.data.id,
      };
    } catch (error) {
      return this._handleError('createTask', error);
    }
  }

  /**
   * Log an email activity
   * @param {Object} emailData - Email activity data
   * @returns {Promise<Object>} Created email engagement
   */
  async logEmail(emailData) {
    try {
      const { subject, body, status, toEmail, fromEmail, contactId } = emailData;

      const response = await this.client.post('/crm/v3/objects/emails', {
        properties: {
          hs_email_subject: subject,
          hs_email_text: body,
          hs_email_status: status || 'SENT',
          hs_email_to_email: toEmail,
          hs_email_from_email: fromEmail,
        },
        associations: contactId
          ? [
              {
                to: { id: contactId },
                types: [
                  {
                    associationCategory: 'HUBSPOT_DEFINED',
                    associationTypeId: 197, // Email to Contact
                  },
                ],
              },
            ]
          : [],
      });

      return {
        success: true,
        email: response.data,
        emailId: response.data.id,
      };
    } catch (error) {
      return this._handleError('logEmail', error);
    }
  }

  /**
   * Create a timeline event (custom activity)
   * @param {Object} eventData - Timeline event data
   * @returns {Promise<Object>} Created event
   */
  async createTimelineEvent(eventData) {
    try {
      const { eventTypeId, objectId, properties, extraData } = eventData;

      const response = await this.client.post('/crm/v3/timeline/events', {
        eventTypeId,
        objectId,
        properties: properties || {},
        extraData: extraData || {},
      });

      return {
        success: true,
        event: response.data,
        eventId: response.data.id,
      };
    } catch (error) {
      return this._handleError('createTimelineEvent', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get association type ID for notes
   * @private
   */
  _getNoteAssociationType(objectType) {
    const types = {
      contact: 202, // Note to Contact
      company: 190, // Note to Company
      deal: 214, // Note to Deal
    };
    return types[objectType.toLowerCase()] || 202;
  }

  /**
   * Get association type ID for tasks
   * @private
   */
  _getTaskAssociationType(objectType) {
    const types = {
      contact: 204, // Task to Contact
      company: 192, // Task to Company
      deal: 216, // Task to Deal
    };
    return types[objectType.toLowerCase()] || 204;
  }

  /**
   * Handle axios errors
   * @private
   */
  _handleAxiosError(error) {
    if (error.response) {
      // HubSpot API error
      const apiError = new Error(
        error.response.data?.message || `HubSpot API error: ${error.response.status}`
      );
      apiError.statusCode = error.response.status;
      apiError.hubspotError = error.response.data;
      throw apiError;
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to reach HubSpot API');
    } else {
      throw error;
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  _handleError(method, error) {
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error',
      method,
      timestamp: new Date().toISOString(),
    };

    if (error.statusCode) {
      errorResponse.statusCode = error.statusCode;
    }

    if (error.hubspotError) {
      errorResponse.hubspotError = error.hubspotError;
    }

    // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
    this.logger.error(`${method} failed`, errorResponse);

    return errorResponse;
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Test API key by fetching contacts (requires only basic CRM scopes)
      const response = await this._makeRequest('get', '/crm/v3/objects/contacts?limit=1');

      return {
        success: true,
        status: 'healthy',
        message: 'HubSpot API connection successful',
        contactsAccessible: response.data?.results?.length >= 0,
      };
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}

// Export for use in sales automation workflows
export default HubSpotClient;
