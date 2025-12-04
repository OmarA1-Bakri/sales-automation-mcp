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

    // Debug: Log API key status (first 30 chars only for security)
    console.log('[API] API Key loaded:', this.apiKey ? `${this.apiKey.substring(0, 30)}...` : 'NOT SET');
    console.log('[API] Base URL:', this.baseURL);

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

      // Add API key if available (backend expects X-API-Key header)
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
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
      // Only log API errors in development mode to prevent E2E test failures
      if (process.env.NODE_ENV === 'development') {
        console.error(`[API Error] ${endpoint}:`, error);
      }
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
  // LEAD DISCOVERY & ICP SCORING
  // ==========================================================================

  /**
   * Test ICP scoring with a sample profile
   * @param {string} profileId - ICP profile ID to test
   * @returns {Promise<Object>} Test score result
   */
  async testICPScore(profileId) {
    return this.call('/api/execute', 'POST', {
      type: 'test_icp_score',
      parameters: { profile_id: profileId },
    });
  }

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
   * Get campaign instances from database (PostgreSQL)
   * These are the actual running campaigns that can be paused/resumed
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status
   * @param {number} options.limit - Max results
   * @returns {Promise<Object>} Campaign instances list
   */
  async getCampaignInstances(options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());

    const query = params.toString();
    const endpoint = query ? `/api/campaigns/instances?${query}` : '/api/campaigns/instances';
    return this.call(endpoint, 'GET');
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
   * Get campaign instance performance metrics
   * @param {string} campaignId - Campaign instance ID
   * @returns {Promise<Object>} Performance metrics including replies, opens, clicks
   */
  async getCampaignPerformance(campaignId) {
    return this.call(`/api/campaigns/instances/${campaignId}/performance`, 'GET');
  }

  /**
   * Bulk enroll contacts in a campaign instance
   * @param {string} campaignId - Campaign instance ID
   * @param {string[]} contactIds - Array of contact IDs to enroll
   * @returns {Promise<Object>} Enrollment results
   */
  async bulkEnrollContacts(campaignId, contactIds) {
    return this.call(`/api/campaigns/instances/${campaignId}/enrollments/bulk`, 'POST', {
      contact_ids: contactIds
    });
  }

  /**
   * List enrollments for a campaign instance
   * @param {string} campaignId - Campaign instance ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of enrollments
   */
  async listEnrollments(campaignId, options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const query = params.toString();
    const endpoint = `/api/campaigns/instances/${campaignId}/enrollments${query ? '?' + query : ''}`;
    return this.call(endpoint, 'GET');
  }

  /**
   * Create a new campaign template
   * @param {Object} campaign - Campaign data
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(campaign) {
    return this.call('/api/campaigns/templates', 'POST', {
      name: campaign.name,
      description: campaign.description || '',
      icp_profile_id: campaign.icpProfileId || campaign.icp_profile_id,
      settings: {
        daily_limit: campaign.settings?.dailyLimit || 50,
        timezone: campaign.settings?.timezone || 'America/New_York'
      },
      email_sequences: campaign.emailSequences || [],
      linkedin_sequences: campaign.linkedinSequences || []
    });
  }

  /**
   * Update an existing campaign template
   * @param {string} campaignId - Campaign ID
   * @param {Object} updates - Campaign data to update
   * @returns {Promise<Object>} Updated campaign
   */
  async updateCampaign(campaignId, updates) {
    return this.call(`/api/campaigns/templates/${campaignId}`, 'PUT', {
      name: updates.name,
      description: updates.description,
      settings: updates.settings
    });
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

  // ==========================================================================
  // HEYGEN VIDEO (Avatar/Voice Selection, Video Generation)
  // ==========================================================================

  /**
   * List available HeyGen avatars
   * @returns {Promise<Object>} List of avatars with preview URLs
   */
  async getHeyGenAvatars() {
    return this.call('/api/heygen/avatars', 'GET');
  }

  /**
   * List available HeyGen voices
   * @param {Object} filters - Optional filters
   * @param {string} filters.language - Filter by language code (e.g., 'en', 'es')
   * @param {string} filters.gender - Filter by gender ('male', 'female')
   * @returns {Promise<Object>} List of voices with sample URLs
   */
  async getHeyGenVoices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.language) params.append('language', filters.language);
    if (filters.gender) params.append('gender', filters.gender);

    const query = params.toString();
    const endpoint = query ? `/api/heygen/voices?${query}` : '/api/heygen/voices';
    return this.call(endpoint, 'GET');
  }

  /**
   * Get HeyGen quota/credits status
   * @returns {Promise<Object>} Quota info { remaining, total, used, resetsAt }
   */
  async getHeyGenQuota() {
    return this.call('/api/heygen/quota', 'GET');
  }

  /**
   * Get video generation status
   * NOTE: HeyGen video URLs expire - call this to get fresh URLs
   * @param {string} videoId - HeyGen video ID
   * @returns {Promise<Object>} Video status and URLs when completed
   */
  async getHeyGenVideoStatus(videoId) {
    return this.call(`/api/heygen/videos/${videoId}/status`, 'GET');
  }

  /**
   * Generate a preview video to test avatar/voice combination
   * @param {Object} params - Generation parameters
   * @param {string} params.avatarId - Selected avatar ID
   * @param {string} params.voiceId - Selected voice ID
   * @param {string} params.script - Text to speak (max 500 chars)
   * @returns {Promise<Object>} Video job { videoId, status }
   */
  async generateHeyGenPreview({ avatarId, voiceId, script }) {
    return this.call('/api/heygen/videos/preview', 'POST', {
      avatarId,
      voiceId,
      script
    });
  }

  /**
   * Get HeyGen provider capabilities
   * @returns {Promise<Object>} Capabilities info
   */
  async getHeyGenCapabilities() {
    return this.call('/api/heygen/capabilities', 'GET');
  }

  /**
   * Validate HeyGen API configuration
   * @returns {Promise<Object>} Validation result { valid, message }
   */
  async validateHeyGenConfig() {
    return this.call('/api/heygen/validate', 'GET');
  }

  /**
   * Poll video status until completion or timeout
   * Utility method for UI components that need to wait for video generation
   * @param {string} videoId - Video ID to poll
   * @param {Object} options - Polling options
   * @param {number} options.interval - Poll interval in ms (default: 3000)
   * @param {number} options.timeout - Max wait time in ms (default: 300000 = 5min)
   * @param {Function} options.onProgress - Callback for progress updates
   * @returns {Promise<Object>} Final video status
   */
  async pollHeyGenVideoUntilComplete(videoId, options = {}) {
    const interval = options.interval || 3000;
    const timeout = options.timeout || 300000;
    const onProgress = options.onProgress || (() => {});

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.getHeyGenVideoStatus(videoId);
      const status = result.data || result;

      onProgress(status);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Video generation timed out');
  }
}

export const api = new APIService();
export default api;
