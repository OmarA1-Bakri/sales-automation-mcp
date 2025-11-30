/**
 * AI Usage Tracker
 * Tracks AI API usage and costs WITHOUT enforcing limits (per user preference)
 * Provides visibility into AI spending for monitoring and budgeting
 */

class AIUsageTracker {
  constructor(database) {
    this.db = database;
    this._initialized = false;
    this._initializeTable();
  }

  /**
   * Initialize AI usage tracking table
   */
  _initializeTable() {
    // Gracefully handle missing database (e.g., during startup before db init)
    if (!this.db || !this.db.db) {
      console.warn('[AIUsageTracker] Database not available, deferring table initialization');
      return;
    }

    this.db.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        workflow_type TEXT,
        job_id TEXT,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for efficient querying
    this.db.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_usage_timestamp ON ai_usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage(provider);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_workflow ON ai_usage(workflow_type);
    `);

    this._initialized = true;
    console.log('[AIUsageTracker] Initialized cost tracking table');
  }

  /**
   * Check if tracker is ready to use
   */
  _ensureInitialized() {
    if (!this._initialized && this.db && this.db.db) {
      this._initializeTable();
    }
    return this._initialized;
  }

  /**
   * Track AI usage for a request
   * @param {Object} usage - Usage data from AI provider
   * @param {string} usage.provider - AI provider (anthropic, gemini)
   * @param {string} usage.model - Model used
   * @param {string} usage.workflowType - Workflow type
   * @param {string} usage.jobId - Job ID
   * @param {Object} usage.tokens - Token usage { input, output, total }
   */
  trackUsage(usage) {
    if (!this._ensureInitialized()) {
      console.warn('[AIUsageTracker] Cannot track usage - database not initialized');
      return;
    }

    const cost = this._calculateCost(usage.provider, usage.model, usage.tokens);

    const stmt = this.db.db.prepare(`
      INSERT INTO ai_usage (
        timestamp, provider, model, workflow_type, job_id,
        input_tokens, output_tokens, total_tokens, estimated_cost_usd
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      new Date().toISOString(),
      usage.provider,
      usage.model,
      usage.workflowType || null,
      usage.jobId || null,
      usage.tokens.input || 0,
      usage.tokens.output || 0,
      usage.tokens.total || 0,
      cost
    );

    console.log(`[AIUsageTracker] Tracked usage: ${usage.provider}/${usage.model} - $${cost.toFixed(4)}`);
  }

  /**
   * Calculate estimated cost based on provider pricing
   * Pricing as of January 2025 (approximate):
   *
   * Anthropic Claude:
   * - Haiku: $0.25 / 1M input tokens, $1.25 / 1M output tokens
   * - Sonnet: $3.00 / 1M input tokens, $15.00 / 1M output tokens
   *
   * Google Gemini:
   * - Flash: $0.075 / 1M input tokens, $0.30 / 1M output tokens
   * - Pro: $1.25 / 1M input tokens, $5.00 / 1M output tokens
   */
  _calculateCost(provider, model, tokens) {
    const inputTokens = tokens.input || 0;
    const outputTokens = tokens.output || 0;

    let inputCostPer1M = 0;
    let outputCostPer1M = 0;

    if (provider === 'anthropic') {
      if (model.includes('haiku')) {
        inputCostPer1M = 0.25;
        outputCostPer1M = 1.25;
      } else if (model.includes('sonnet')) {
        inputCostPer1M = 3.00;
        outputCostPer1M = 15.00;
      } else {
        // Default to Sonnet pricing for unknown models
        inputCostPer1M = 3.00;
        outputCostPer1M = 15.00;
      }
    } else if (provider === 'gemini') {
      if (model.includes('flash')) {
        inputCostPer1M = 0.075;
        outputCostPer1M = 0.30;
      } else if (model.includes('pro')) {
        inputCostPer1M = 1.25;
        outputCostPer1M = 5.00;
      } else {
        // Default to Pro pricing
        inputCostPer1M = 1.25;
        outputCostPer1M = 5.00;
      }
    }

    const inputCost = (inputTokens / 1000000) * inputCostPer1M;
    const outputCost = (outputTokens / 1000000) * outputCostPer1M;

    return inputCost + outputCost;
  }

  /**
   * Get usage summary for a time period
   * @param {string} period - Time period: 'today', 'week', 'month', 'all'
   * @returns {Object} Usage summary
   */
  getUsageSummary(period = 'month') {
    if (!this._ensureInitialized()) {
      return { total_requests: 0, total_input_tokens: 0, total_output_tokens: 0, total_tokens: 0, total_cost_usd: 0, avg_cost_per_request: 0 };
    }

    let dateFilter = '';

    switch (period) {
      case 'today':
        dateFilter = "AND timestamp >= date('now')";
        break;
      case 'week':
        dateFilter = "AND timestamp >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND timestamp >= date('now', '-30 days')";
        break;
      case 'all':
      default:
        dateFilter = '';
    }

    const stmt = this.db.db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost_usd) as total_cost_usd,
        AVG(estimated_cost_usd) as avg_cost_per_request
      FROM ai_usage
      WHERE 1=1 ${dateFilter}
    `);

    return stmt.get();
  }

  /**
   * Get usage breakdown by provider
   * @param {string} period - Time period
   * @returns {Array} Provider breakdown
   */
  getProviderBreakdown(period = 'month') {
    if (!this._ensureInitialized()) {
      return [];
    }

    let dateFilter = '';

    switch (period) {
      case 'today':
        dateFilter = "AND timestamp >= date('now')";
        break;
      case 'week':
        dateFilter = "AND timestamp >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND timestamp >= date('now', '-30 days')";
        break;
      default:
        dateFilter = '';
    }

    const stmt = this.db.db.prepare(`
      SELECT
        provider,
        model,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost_usd) as total_cost_usd
      FROM ai_usage
      WHERE 1=1 ${dateFilter}
      GROUP BY provider, model
      ORDER BY total_cost_usd DESC
    `);

    return stmt.all();
  }

  /**
   * Get usage breakdown by workflow type
   * @param {string} period - Time period
   * @returns {Array} Workflow breakdown
   */
  getWorkflowBreakdown(period = 'month') {
    if (!this._ensureInitialized()) {
      return [];
    }

    let dateFilter = '';

    switch (period) {
      case 'today':
        dateFilter = "AND timestamp >= date('now')";
        break;
      case 'week':
        dateFilter = "AND timestamp >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND timestamp >= date('now', '-30 days')";
        break;
      default:
        dateFilter = '';
    }

    const stmt = this.db.db.prepare(`
      SELECT
        COALESCE(workflow_type, 'unknown') as workflow_type,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost_usd) as total_cost_usd
      FROM ai_usage
      WHERE 1=1 ${dateFilter}
      GROUP BY workflow_type
      ORDER BY total_cost_usd DESC
    `);

    return stmt.all();
  }

  /**
   * Get daily cost trend
   * @param {number} days - Number of days to retrieve
   * @returns {Array} Daily costs
   */
  getDailyCostTrend(days = 30) {
    if (!this._ensureInitialized()) {
      return [];
    }

    const stmt = this.db.db.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as request_count,
        SUM(estimated_cost_usd) as total_cost_usd
      FROM ai_usage
      WHERE timestamp >= date('now', '-${days} days')
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    return stmt.all();
  }

  /**
   * Get comprehensive dashboard data
   * @returns {Object} Dashboard data with all metrics
   */
  getDashboardData() {
    return {
      summary: {
        today: this.getUsageSummary('today'),
        week: this.getUsageSummary('week'),
        month: this.getUsageSummary('month'),
        all: this.getUsageSummary('all')
      },
      by_provider: this.getProviderBreakdown('month'),
      by_workflow: this.getWorkflowBreakdown('month'),
      daily_trend: this.getDailyCostTrend(30),
      note: 'Cost tracking only - no limits enforced (per user preference)'
    };
  }
}

export default AIUsageTracker;
