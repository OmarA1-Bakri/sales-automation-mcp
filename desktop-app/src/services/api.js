/**
 * API Service
 *
 * Handles all communication with the MCP server via Electron IPC or direct HTTP
 */

class APIService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // SECURITY: API key should be set via setApiKey() method, NOT hardcoded
    // For local development, set VITE_API_KEY in .env.local file
    this.apiKey = import.meta.env.VITE_API_KEY || null;

    if (!this.apiKey && import.meta.env.MODE === 'production') {
      console.warn('[SECURITY] No API key configured. Set VITE_API_KEY environment variable.');
    }
  }

  /**
   * Check if running in Electron
   */
  isElectron() {
    return typeof window !== 'undefined' && window.electron;
  }

  /**
   * Make API call via Electron IPC or direct HTTP
   */
  async call(endpoint, method = 'POST', data = null) {
    try {
      // Use Electron IPC if available
      if (this.isElectron()) {
        const response = await window.electron.mcpCall(endpoint, method, data, this.apiKey);
        if (!response.success) {
          throw new Error(response.error?.message || response.error || 'API call failed');
        }
        return response.data;
      }

      // Fallback to direct HTTP call
      const url = `${this.baseURL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add API key if available
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const options = {
        method,
        headers,
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'API call failed');
      }

      return result;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Set API key for authentication
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  // ==========================================================================
  // YOLO MODE
  // ==========================================================================

  async enableYOLO(options = {}) {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_enable',
      parameters: options,
    });
  }

  async disableYOLO(options = {}) {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_disable',
      parameters: options,
    });
  }

  async getYOLOStatus() {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_status',
      parameters: { detailed: true },
    });
  }

  async pauseYOLO() {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_pause',
      parameters: {},
    });
  }

  async resumeYOLO() {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_resume',
      parameters: {},
    });
  }

  async emergencyStopYOLO(reason) {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_emergency_stop',
      parameters: { reason },
    });
  }

  async triggerYOLOCycle(skipSteps = []) {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_trigger_cycle',
      parameters: { skip_steps: skipSteps },
    });
  }

  async getYOLOConfig() {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_get_config',
      parameters: {},
    });
  }

  async updateYOLOConfig(config, restart = false) {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_update_config',
      parameters: { config, restart },
    });
  }

  async getYOLOActivity(options = {}) {
    return this.call('/api/execute', 'POST', {
      type: 'yolo_get_activity',
      parameters: options,
    });
  }

  // ==========================================================================
  // LEAD DISCOVERY
  // ==========================================================================

  async discoverLeadsByICP(icpProfile, count = 50, minScore = 0.75) {
    return this.call('/api/execute', 'POST', {
      type: 'discover_leads_icp',
      parameters: {
        icp_profile_id: icpProfile,
        limit: count,
        min_score: minScore,
      },
    });
  }

  // ==========================================================================
  // ENRICHMENT
  // ==========================================================================

  async enrichContact(contact) {
    return this.call('/api/execute', 'POST', {
      type: 'enrich_contact',
      parameters: contact,
    });
  }

  async enrichBatch(contacts) {
    return this.call('/api/execute', 'POST', {
      type: 'enrich_batch',
      parameters: { contacts },
    });
  }

  // ==========================================================================
  // CRM SYNC
  // ==========================================================================

  async syncToHubSpot(contacts, options = {}) {
    return this.call('/api/execute', 'POST', {
      type: 'sync_to_crm',
      parameters: {
        contacts,
        create_companies: options.createCompanies !== false,
        deduplicate: options.deduplicate !== false,
      },
    });
  }

  // ==========================================================================
  // OUTREACH
  // ==========================================================================

  async getCampaigns() {
    return this.call('/api/execute', 'POST', {
      type: 'get_campaigns',
      parameters: {},
    });
  }

  async enrollInCampaign(campaignId, contacts) {
    return this.call('/api/execute', 'POST', {
      type: 'enroll_in_campaign',
      parameters: {
        campaign_id: campaignId,
        contacts,
      },
    });
  }

  async checkReplies() {
    return this.call('/api/execute', 'POST', {
      type: 'check_replies',
      parameters: {},
    });
  }

  // ==========================================================================
  // IMPORT
  // ==========================================================================

  async importFromCSV(filePath, options = {}) {
    return this.call('/api/execute', 'POST', {
      type: 'import_csv',
      parameters: {
        file_path: filePath,
        custom_mapping: options.customMapping,
        skip_header: options.skipHeader !== false,
        deduplicate: options.deduplicate !== false,
      },
    });
  }

  async importFromLemlist(options = {}) {
    return this.call('/api/import/lemlist', 'POST', {
      campaignId: options.campaignId,
      campaignName: options.campaignName,
      status: options.status || 'all',
      limit: options.limit || 1000,
      deduplicate: options.deduplicate !== false,
    });
  }

  async importFromHubSpot(options = {}) {
    return this.call('/api/import/hubspot', 'POST', {
      listId: options.listId,
      filters: options.filters || [],
      properties: options.properties || [
        'email',
        'firstname',
        'lastname',
        'jobtitle',
        'company',
      ],
      limit: options.limit || 1000,
      deduplicate: options.deduplicate !== false,
    });
  }

  // ==========================================================================
  // ENRICHMENT (Direct API)
  // ==========================================================================

  /**
   * Enrich contacts with company data and intelligence
   * @param {Array} contacts - Contacts to enrich
   * @param {Object} options - Enrichment options
   * @returns {Promise<Object>} Enrichment results
   */
  async enrichContacts(contacts, options = {}) {
    return this.call('/api/enrich', 'POST', {
      contacts,
      options: {
        cache: options.cache !== false,
        includeCompany: options.includeCompany !== false,
        includeIntelligence: options.includeIntelligence !== false
      }
    });
  }

  // ==========================================================================
  // CRM SYNC (Direct API)
  // ==========================================================================

  /**
   * Sync enriched contacts to HubSpot CRM
   * @param {Array} contacts - Enriched contacts to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncToHubSpotDirect(contacts, options = {}) {
    return this.call('/api/sync/hubspot', 'POST', {
      contacts,
      options: {
        deduplicate: options.deduplicate !== false,
        createIfNew: options.createIfNew !== false,
        updateIfExists: options.updateIfExists !== false,
        associateCompany: options.associateCompany !== false,
        logActivity: options.logActivity !== false
      }
    });
  }

  // ==========================================================================
  // CONTACTS
  // ==========================================================================

  /**
   * Get contacts from database
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Contacts list
   */
  async getContacts(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.source) params.append('source', filters.source);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    const endpoint = query ? `/api/contacts?${query}` : '/api/contacts';

    return this.call(endpoint, 'GET');
  }

  // ==========================================================================
  // JOBS
  // ==========================================================================

  async getJobs(filters = {}) {
    return this.call('/api/execute', 'POST', {
      type: 'list_jobs',
      parameters: filters,
    });
  }

  async getJobStatus(jobId) {
    return this.call('/api/execute', 'POST', {
      type: 'get_job_status',
      parameters: { job_id: jobId },
    });
  }

  async cancelJob(jobId) {
    return this.call('/api/execute', 'POST', {
      type: 'cancel_job',
      parameters: { job_id: jobId },
    });
  }

  // ==========================================================================
  // SETTINGS & SYSTEM
  // ==========================================================================

  async testConnection() {
    return this.call('/health', 'GET');
  }

  async getStats() {
    return this.call('/stats', 'GET');
  }

  async getYOLOStatusDirect() {
    return this.call('/api/yolo/status', 'GET');
  }

  async getCampaignsDirect() {
    return this.call('/api/campaigns', 'GET');
  }

  /**
   * Update campaign instance status (pause/resume/complete)
   * @param {string} campaignId - Campaign instance ID
   * @param {string} status - New status ('active', 'paused', 'completed')
   * @returns {Promise<Object>} Updated campaign
   */
  async updateCampaignStatus(campaignId, status) {
    return this.call(`/api/campaigns/instances/${campaignId}`, 'PATCH', { status });
  }

  /**
   * Update ICP profile
   * NOTE: Backend endpoint not yet implemented - will return error
   * @param {string} profileId - ICP profile ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateICPProfile(profileId, updates) {
    return this.call(`/api/icp/${profileId}`, 'PATCH', updates);
  }

  async getJobsDirect() {
    return this.call('/api/jobs', 'GET');
  }

  // ==========================================================================
  // AI CHAT ASSISTANT
  // ==========================================================================

  /**
   * Send a chat message to the AI assistant
   * @param {Object} params - Message parameters
   * @param {string} params.message - User's message
   * @param {string} params.conversationId - Optional conversation ID for context
   * @returns {Promise<Object>} Assistant response
   */
  async sendChatMessage({ message, conversationId = null }) {
    return this.call('/api/chat', 'POST', {
      message,
      conversationId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get chat conversation history
   * @param {string} conversationId - Optional conversation ID
   * @returns {Promise<Object>} Conversation history
   */
  async getChatHistory(conversationId = null) {
    const params = conversationId ? `?conversationId=${conversationId}` : '';
    return this.call(`/api/chat/history${params}`, 'GET');
  }

  /**
   * Clear chat history
   * @param {string} conversationId - Optional conversation ID to clear
   * @returns {Promise<Object>} Success response
   */
  async clearChatHistory(conversationId = null) {
    return this.call('/api/chat/clear', 'POST', { conversationId });
  }

  /**
   * Get suggested actions from AI
   * @returns {Promise<Array>} List of suggested actions
   */
  async getChatSuggestions() {
    return this.call('/api/chat/suggestions', 'GET');
  }

  // ==========================================================================
  // WORKFLOWS (B-MAD Integration)
  // ==========================================================================

  /**
   * Get available workflow definitions
   * @param {Object} options - Options
   * @param {boolean} options.includeMetadata - Include YAML metadata
   * @returns {Promise<Object>} List of workflow definitions
   */
  async getWorkflowDefinitions(options = {}) {
    const params = options.includeMetadata ? '?includeMetadata=true' : '';
    return this.call(`/api/workflows/definitions${params}`, 'GET');
  }

  /**
   * Execute a workflow
   * @param {Object} params - Execution parameters
   * @param {string} params.workflowName - Name of workflow to execute
   * @param {Object} params.inputs - Initial inputs for the workflow
   * @param {boolean} params.sync - Execute synchronously (default: false)
   * @param {string} params.priority - Execution priority (low/normal/high/critical)
   * @param {number} params.timeout - Timeout for sync execution (ms)
   * @returns {Promise<Object>} Execution result or job info
   */
  async executeWorkflow({ workflowName, inputs = {}, sync = false, priority = 'normal', timeout = 60000 }) {
    return this.call('/api/workflows/execute', 'POST', {
      workflowName,
      inputs,
      sync,
      priority,
      timeout
    });
  }

  /**
   * Get workflow execution status
   * @param {string} jobId - Workflow job ID
   * @returns {Promise<Object>} Workflow status
   */
  async getWorkflowStatus(jobId) {
    return this.call(`/api/workflows/${jobId}`, 'GET');
  }

  /**
   * List workflow executions
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status
   * @param {string} filters.workflowName - Filter by workflow type
   * @param {number} filters.limit - Max results
   * @param {number} filters.offset - Results offset
   * @returns {Promise<Object>} List of workflow executions
   */
  async listWorkflows(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.workflowName) params.append('workflowName', filters.workflowName);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    const endpoint = query ? `/api/workflows?${query}` : '/api/workflows';
    return this.call(endpoint, 'GET');
  }

  /**
   * Cancel a pending workflow
   * @param {string} jobId - Workflow job ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelWorkflow(jobId, reason = 'User requested cancellation') {
    return this.call(`/api/workflows/${jobId}`, 'DELETE', { reason });
  }
}

export const api = new APIService();
export default api;
