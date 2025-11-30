/**
 * Database utility for job queue and enrichment cache
 * Uses SQLite for persistent storage
 */

import BetterSqlite3 from 'better-sqlite3';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export class Database {
  constructor(dbPath = '.sales-automation/sales-automation.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Safe JSON parser that handles corrupted data gracefully
   */
  safeParse(json, defaultValue = null) {
    if (!json) return defaultValue;
    try {
      return JSON.parse(json);
    } catch (error) {
      // Note: Using console.error here as this is called before logger may be initialized
      // In production, consider using a logger if available
      console.error(`[Database] JSON parse failed: ${error.message}`);
      return defaultValue;
    }
  }

  async initialize() {
    // Ensure directory exists
    await mkdir(dirname(this.dbPath), { recursive: true });

    // Open database
    this.db = new BetterSqlite3(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.createTables();
  }

  /**
   * Prepare a SQL statement
   * @param {string} sql - SQL query
   * @returns {Statement} Prepared statement
   */
  prepare(sql) {
    return this.db.prepare(sql);
  }

  createTables() {
    // Jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        parameters TEXT NOT NULL,
        result TEXT,
        error TEXT,
        progress REAL DEFAULT 0,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create index on status for efficient queue queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, priority, created_at)
    `);

    // ARCH-005 FIX: Add index for type-based job queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type, status);
    `);

    // Enrichment cache table (simple key-value cache)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS enrichment_cache (
        type TEXT NOT NULL,
        key TEXT NOT NULL,
        data TEXT NOT NULL,
        cached_at TEXT NOT NULL,
        PRIMARY KEY (type, key)
      )
    `);

    // ARCH-005 FIX: Add index for cache expiry queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_enrichment_cache_expiry ON enrichment_cache(type, cached_at);
    `);

    // API rate limit tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        api_name TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL,
        limit_per_window INTEGER NOT NULL,
        window_duration_ms INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Performance metrics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_type TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        value REAL NOT NULL,
        metadata TEXT,
        recorded_at INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics(metric_type, recorded_at);
    `);

    // Imported contacts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS imported_contacts (
        email TEXT PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        title TEXT,
        company TEXT,
        company_domain TEXT,
        phone TEXT,
        linkedin_url TEXT,
        source TEXT NOT NULL,
        data TEXT NOT NULL,
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_imported_source ON imported_contacts(source);
      CREATE INDEX IF NOT EXISTS idx_imported_date ON imported_contacts(imported_at);
    `);

    // ARCH-005 FIX: Add indexes for common query patterns
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_imported_company_domain ON imported_contacts(company_domain);
      CREATE INDEX IF NOT EXISTS idx_imported_company ON imported_contacts(company);
    `);

    // YOLO activity log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS yolo_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_type TEXT NOT NULL,
        activity_date TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_yolo_activity_type ON yolo_activity(activity_type);
      CREATE INDEX IF NOT EXISTS idx_yolo_activity_date ON yolo_activity(activity_date);
    `);

    // HubSpot sync state table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hubspot_sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_sync_timestamp TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Initialize with default timestamp (30 days ago) if not exists
    // SECURITY FIX: Validate and sanitize lookbackDays to prevent SQL injection
    const lookbackDaysRaw = process.env.HUBSPOT_SYNC_LOOKBACK_DAYS || '30';
    const lookbackDays = parseInt(lookbackDaysRaw, 10);

    // Validate: must be a positive integer between 1 and 365
    let validatedDays = 30;
    if (isNaN(lookbackDays) || lookbackDays < 1 || lookbackDays > 365) {
      console.warn(`[Database] Invalid HUBSPOT_SYNC_LOOKBACK_DAYS: "${lookbackDaysRaw}". Using default: 30`);
    } else {
      validatedDays = lookbackDays;
    }

    // Calculate timestamp in JavaScript and use parameterized query
    const lookbackTimestamp = new Date(Date.now() - validatedDays * 24 * 60 * 60 * 1000).toISOString();
    const currentTimestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO hubspot_sync_state (id, last_sync_timestamp, updated_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(1, lookbackTimestamp, currentTimestamp);

    // HubSpot sync log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hubspot_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_started_at TEXT NOT NULL,
        sync_completed_at TEXT,
        last_sync_timestamp TEXT,
        contacts_fetched INTEGER DEFAULT 0,
        contacts_created INTEGER DEFAULT 0,
        contacts_updated INTEGER DEFAULT 0,
        contacts_re_enriched INTEGER DEFAULT 0,
        contacts_skipped INTEGER DEFAULT 0,
        errors TEXT,
        status TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_hubspot_sync_status ON hubspot_sync_log(status);
      CREATE INDEX IF NOT EXISTS idx_hubspot_sync_date ON hubspot_sync_log(sync_started_at);
    `);

    // CRM sync log table (individual record syncs)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crm_sync_log (
        type TEXT NOT NULL,
        identifier TEXT NOT NULL,
        hubspot_id TEXT,
        metadata TEXT,
        synced_at TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crm_sync_log_identifier ON crm_sync_log(type, identifier);
      CREATE INDEX IF NOT EXISTS idx_crm_sync_log_date ON crm_sync_log(synced_at);
    `);

    // Add hubspot_last_modified column to imported_contacts if not exists
    try {
      this.db.exec(`
        ALTER TABLE imported_contacts ADD COLUMN hubspot_last_modified TEXT
      `);
    } catch (error) {
      // Column already exists, ignore
    }

    // Add data_quality_last_check column if not exists
    try {
      this.db.exec(`
        ALTER TABLE imported_contacts ADD COLUMN data_quality_last_check TEXT
      `);
    } catch (error) {
      // Column already exists, ignore
    }

    // Chat conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        conversation_id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(conversation_id)
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
    `);

    // Lead conversation tables (for ConversationalResponder - dynamic AI replies)
    // Designed for future Neo4j migration: tables map to graph nodes/edges
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lead_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_email TEXT NOT NULL,
        lead_name TEXT,
        company_name TEXT,
        campaign_id TEXT,
        enrollment_id TEXT,
        channel TEXT DEFAULT 'email',
        thread_id TEXT,
        status TEXT DEFAULT 'active',
        ai_responses_count INTEGER DEFAULT 0,
        last_message_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lead_email, campaign_id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lead_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        direction TEXT NOT NULL,
        content TEXT NOT NULL,
        subject TEXT,
        message_type TEXT,
        sentiment TEXT,
        detected_intent TEXT,
        ai_generated INTEGER DEFAULT 0,
        knowledge_used TEXT,
        lemlist_activity_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES lead_conversations(id)
      )
    `);

    // Junction table for knowledge usage tracking (maps to USED_KNOWLEDGE edge in future graph)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_knowledge_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        knowledge_type TEXT NOT NULL,
        knowledge_key TEXT NOT NULL,
        relevance_score REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES lead_messages(id)
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_lead_conversations_email ON lead_conversations(lead_email);
      CREATE INDEX IF NOT EXISTS idx_lead_conversations_campaign ON lead_conversations(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_lead_messages_conv ON lead_messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_message_knowledge ON message_knowledge_usage(message_id);
    `);
  }

  // Job operations
  createJob(id, type, parameters, priority = 'normal') {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, type, status, priority, parameters, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
    `);

    stmt.run(id, type, priority, JSON.stringify(parameters), now, now);

    return { id, type, status: 'pending', priority, created_at: now };
  }

  getJob(id) {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return {
      ...row,
      parameters: this.safeParse(row.parameters, {}),
      result: this.safeParse(row.result),
    };
  }

  updateJobStatus(id, status, result = null, error = null) {
    const now = Date.now();
    const updates = { status, updated_at: now };

    // Check if job exists and needs started_at timestamp
    const job = this.getJob(id);
    if (status === 'processing' && (!job || !job.started_at)) {
      updates.started_at = now;
    }

    if (status === 'completed' || status === 'failed') {
      updates.completed_at = now;
    }

    if (result) {
      updates.result = JSON.stringify(result);
    }

    if (error) {
      updates.error = error;
    }

    // SECURITY FIX: Whitelist allowed field names to prevent SQL injection
    // Field names are validated against both a whitelist AND a regex pattern
    // This dual-layer approach ensures no SQL injection even if whitelist is misconfigured
    const ALLOWED_FIELDS = ['status', 'updated_at', 'started_at', 'completed_at', 'result', 'error', 'progress'];
    const FIELD_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/i; // Only alphanumeric + underscore
    const fieldNames = Object.keys(updates);

    // Validate all field names against whitelist AND regex pattern
    for (const field of fieldNames) {
      if (!ALLOWED_FIELDS.includes(field)) {
        throw new Error(`[Database Security] Attempt to update disallowed field: ${field}`);
      }
      if (!FIELD_NAME_PATTERN.test(field)) {
        throw new Error(`[Database Security] Invalid field name format: ${field}`);
      }
    }

    // Safe to interpolate field names after validation - values still use parameterized queries
    const fields = fieldNames.map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`UPDATE jobs SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  updateJobProgress(id, progress) {
    const stmt = this.db.prepare(`
      UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(progress, Date.now(), id);
  }

  getJobStats() {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM jobs
    `);

    return stmt.get();
  }

  getNextPendingJob() {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE status = 'pending'
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at ASC
      LIMIT 1
    `);

    const row = stmt.get();
    if (!row) return null;

    return {
      ...row,
      parameters: this.safeParse(row.parameters, {}),
    };
  }

  listJobs(filters = {}) {
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 50);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      parameters: this.safeParse(row.parameters, {}),
      result: this.safeParse(row.result),
    }));
  }

  cancelJob(id) {
    const job = this.getJob(id);
    if (!job) return false;

    if (job.status === 'pending') {
      this.updateJobStatus(id, 'cancelled');
      return true;
    }

    return false; // Can't cancel running/completed jobs
  }

  // Enrichment cache operations
  cacheEnrichment(id, email, domain, data, qualityScore, sources, ttlHours = 720) {
    const now = Date.now();
    const expiresAt = now + (ttlHours * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO enrichment_cache
      (id, contact_email, company_domain, enrichment_data, quality_score, data_sources, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      email,
      domain,
      JSON.stringify(data),
      qualityScore,
      JSON.stringify(sources),
      now,
      expiresAt
    );
  }

  getCachedEnrichment(email = null, domain = null) {
    const now = Date.now();

    let query = 'SELECT * FROM enrichment_cache WHERE expires_at > ?';
    const params = [now];

    if (email) {
      query += ' AND contact_email = ?';
      params.push(email);
    } else if (domain) {
      query += ' AND company_domain = ?';
      params.push(domain);
    } else {
      return null;
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params);

    if (!row) return null;

    return {
      ...row,
      enrichment_data: this.safeParse(row.enrichment_data, {}),
      data_sources: this.safeParse(row.data_sources, []),
    };
  }

  cleanExpiredCache() {
    const stmt = this.db.prepare('DELETE FROM enrichment_cache WHERE expires_at < ?');
    const result = stmt.run(Date.now());
    return result.changes;
  }

  // Rate limit tracking
  checkRateLimit(apiName, limitPerWindow, windowDurationMs) {
    const now = Date.now();

    const stmt = this.db.prepare('SELECT * FROM rate_limits WHERE api_name = ?');
    let record = stmt.get(apiName);

    if (!record) {
      // First request, create record
      const insertStmt = this.db.prepare(`
        INSERT INTO rate_limits (api_name, window_start, request_count, limit_per_window, window_duration_ms, updated_at)
        VALUES (?, ?, 1, ?, ?, ?)
      `);
      insertStmt.run(apiName, now, limitPerWindow, windowDurationMs, now);
      return { allowed: true, remaining: limitPerWindow - 1 };
    }

    // Check if window has expired
    if (now - record.window_start >= record.window_duration_ms) {
      // New window, reset
      const updateStmt = this.db.prepare(`
        UPDATE rate_limits SET window_start = ?, request_count = 1, updated_at = ? WHERE api_name = ?
      `);
      updateStmt.run(now, now, apiName);
      return { allowed: true, remaining: limitPerWindow - 1 };
    }

    // Within window, check limit
    if (record.request_count >= record.limit_per_window) {
      const resetIn = record.window_start + record.window_duration_ms - now;
      return { allowed: false, remaining: 0, resetIn };
    }

    // Increment count
    const updateStmt = this.db.prepare(`
      UPDATE rate_limits SET request_count = request_count + 1, updated_at = ? WHERE api_name = ?
    `);
    updateStmt.run(now, apiName);

    return { allowed: true, remaining: record.limit_per_window - record.request_count - 1 };
  }

  // Metrics recording
  recordMetric(metricType, metricName, value, metadata = null) {
    const stmt = this.db.prepare(`
      INSERT INTO metrics (metric_type, metric_name, value, metadata, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(metricType, metricName, value, metadata ? JSON.stringify(metadata) : null, Date.now());
  }

  getMetrics(metricType, since = null, limit = 100) {
    let query = 'SELECT * FROM metrics WHERE metric_type = ?';
    const params = [metricType];

    if (since) {
      query += ' AND recorded_at >= ?';
      params.push(since);
    }

    query += ' ORDER BY recorded_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      metadata: this.safeParse(row.metadata),
    }));
  }

  // Cleanup old data
  cleanup(daysToKeep = 90) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    // Clean old completed jobs
    const jobsStmt = this.db.prepare(`
      DELETE FROM jobs WHERE status IN ('completed', 'failed', 'cancelled') AND completed_at < ?
    `);
    const jobsDeleted = jobsStmt.run(cutoff).changes;

    // Clean expired cache
    const cacheDeleted = this.cleanExpiredCache();

    // Clean old metrics
    const metricsStmt = this.db.prepare('DELETE FROM metrics WHERE recorded_at < ?');
    const metricsDeleted = metricsStmt.run(cutoff).changes;

    return { jobsDeleted, cacheDeleted, metricsDeleted };
  }

  // Chat operations
  saveChatMessage(conversationId, role, content) {
    // Ensure conversation exists
    const conversationStmt = this.db.prepare(`
      INSERT OR IGNORE INTO chat_conversations (conversation_id)
      VALUES (?)
    `);
    conversationStmt.run(conversationId);

    // Update conversation timestamp
    const updateStmt = this.db.prepare(`
      UPDATE chat_conversations
      SET updated_at = datetime('now')
      WHERE conversation_id = ?
    `);
    updateStmt.run(conversationId);

    // Insert message
    const messageStmt = this.db.prepare(`
      INSERT INTO chat_messages (conversation_id, role, content)
      VALUES (?, ?, ?)
    `);
    messageStmt.run(conversationId, role, content);
  }

  getChatHistory(conversationId) {
    const stmt = this.db.prepare(`
      SELECT role, content, created_at
      FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(conversationId);
  }

  listConversations(limit = 50) {
    // PERF-006 FIX: Replaced correlated subquery with JOIN to derived table
    // Original query ran subquery per row (O(n) extra queries)
    // New query gets all first messages in single scan, then joins (O(1) queries)
    const stmt = this.db.prepare(`
      SELECT
        c.conversation_id,
        c.created_at,
        c.updated_at,
        COUNT(m.id) as message_count,
        fm.content as first_message
      FROM chat_conversations c
      LEFT JOIN chat_messages m ON c.conversation_id = m.conversation_id
      LEFT JOIN (
        SELECT cm.conversation_id, cm.content
        FROM chat_messages cm
        INNER JOIN (
          SELECT conversation_id, MIN(created_at) as min_created
          FROM chat_messages
          WHERE role = 'user'
          GROUP BY conversation_id
        ) first ON cm.conversation_id = first.conversation_id
               AND cm.created_at = first.min_created
               AND cm.role = 'user'
      ) fm ON c.conversation_id = fm.conversation_id
      GROUP BY c.conversation_id
      ORDER BY c.updated_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Lead Conversation operations (for ConversationalResponder)
  
  /**
   * Get or create a lead conversation thread
   * @param {string} leadEmail - Lead's email address
   * @param {string} campaignId - Campaign ID
   * @param {object} options - Additional options (channel, leadName, companyName, enrollmentId)
   * @returns {object} Conversation record
   */
  getOrCreateLeadConversation(leadEmail, campaignId, options = {}) {
    const { channel = 'email', leadName = null, companyName = null, enrollmentId = null, threadId = null } = options;

    // Use INSERT OR IGNORE to handle race conditions atomically
    // The UNIQUE(lead_email, campaign_id) constraint ensures no duplicates
    this.db.prepare(`
      INSERT OR IGNORE INTO lead_conversations
      (lead_email, lead_name, company_name, campaign_id, enrollment_id, channel, thread_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(leadEmail, leadName, companyName, campaignId, enrollmentId, channel, threadId);

    // Always update timestamp and return the conversation (whether new or existing)
    this.db.prepare(`
      UPDATE lead_conversations
      SET updated_at = datetime('now')
      WHERE lead_email = ? AND campaign_id = ?
    `).run(leadEmail, campaignId);

    return this.db.prepare(`
      SELECT * FROM lead_conversations
      WHERE lead_email = ? AND campaign_id = ?
    `).get(leadEmail, campaignId);
  }

  /**
   * Add a message to a lead conversation
   * @param {number} conversationId - Conversation ID
   * @param {string} direction - 'inbound' or 'outbound'
   * @param {string} content - Message content
   * @param {object} options - Additional metadata
   * @returns {object} Message record
   */
  addLeadMessage(conversationId, direction, content, options = {}) {
    const { 
      subject = null, 
      messageType = null, 
      sentiment = null, 
      detectedIntent = null,
      aiGenerated = false, 
      knowledgeUsed = null,
      lemlistActivityId = null 
    } = options;
    
    const result = this.db.prepare(`
      INSERT INTO lead_messages (
        conversation_id, direction, content, subject, message_type, 
        sentiment, detected_intent, ai_generated, knowledge_used, lemlist_activity_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      conversationId, direction, content, subject, messageType,
      sentiment, detectedIntent, aiGenerated ? 1 : 0, 
      knowledgeUsed ? JSON.stringify(knowledgeUsed) : null, 
      lemlistActivityId
    );
    
    // Update conversation timestamp and AI response count if applicable
    if (aiGenerated && direction === 'outbound') {
      this.db.prepare(`
        UPDATE lead_conversations 
        SET updated_at = datetime('now'), 
            last_message_at = datetime('now'),
            ai_responses_count = ai_responses_count + 1
        WHERE id = ?
      `).run(conversationId);
    } else {
      this.db.prepare(`
        UPDATE lead_conversations 
        SET updated_at = datetime('now'), last_message_at = datetime('now')
        WHERE id = ?
      `).run(conversationId);
    }
    
    return this.db.prepare('SELECT * FROM lead_messages WHERE id = ?').get(result.lastInsertRowid);
  }

  /**
   * Get conversation history for a lead
   * @param {string} leadEmail - Lead's email
   * @param {string} campaignId - Optional campaign ID filter
   * @returns {array} Messages ordered by time
   */
  getLeadConversationHistory(leadEmail, campaignId = null) {
    let query = `
      SELECT 
        lc.id as conversation_id,
        lc.lead_email,
        lc.lead_name,
        lc.company_name,
        lc.channel,
        lc.ai_responses_count,
        lm.id as message_id,
        lm.direction,
        lm.content,
        lm.subject,
        lm.message_type,
        lm.sentiment,
        lm.detected_intent,
        lm.ai_generated,
        lm.knowledge_used,
        lm.created_at
      FROM lead_conversations lc
      JOIN lead_messages lm ON lc.id = lm.conversation_id
      WHERE lc.lead_email = ?
    `;
    const params = [leadEmail];
    
    if (campaignId) {
      query += ' AND lc.campaign_id = ?';
      params.push(campaignId);
    }
    
    query += ' ORDER BY lm.created_at ASC';
    
    return this.db.prepare(query).all(...params);
  }

  /**
   * Get conversation by ID with all messages
   * @param {number} conversationId - Conversation ID
   * @returns {object} Conversation with messages
   */
  getLeadConversation(conversationId) {
    const conversation = this.db.prepare(`
      SELECT * FROM lead_conversations WHERE id = ?
    `).get(conversationId);
    
    if (!conversation) return null;
    
    const messages = this.db.prepare(`
      SELECT * FROM lead_messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(conversationId);
    
    return { ...conversation, messages };
  }

  /**
   * Check if we should respond (respects max AI responses limit)
   * @param {number} conversationId - Conversation ID
   * @param {number} maxResponses - Maximum AI responses allowed
   * @returns {boolean} Whether AI can respond
   */
  canAIRespond(conversationId, maxResponses = 5) {
    const conversation = this.db.prepare(`
      SELECT ai_responses_count, status FROM lead_conversations WHERE id = ?
    `).get(conversationId);
    
    if (!conversation) return false;
    if (conversation.status !== 'active') return false;
    if (conversation.ai_responses_count >= maxResponses) return false;
    
    return true;
  }

  /**
   * Track knowledge usage for a message (for learning/future graph)
   * @param {number} messageId - Message ID
   * @param {string} knowledgeType - Type (case_study, value_prop, objection_handler, etc.)
   * @param {string} knowledgeKey - Identifier for the knowledge item
   * @param {number} relevanceScore - How relevant (0-1)
   */
  trackKnowledgeUsage(messageId, knowledgeType, knowledgeKey, relevanceScore = 1.0) {
    this.db.prepare(`
      INSERT INTO message_knowledge_usage (message_id, knowledge_type, knowledge_key, relevance_score)
      VALUES (?, ?, ?, ?)
    `).run(messageId, knowledgeType, knowledgeKey, relevanceScore);
  }

  /**
   * Get knowledge usage stats (what knowledge items lead to positive outcomes)
   * @returns {array} Knowledge usage with outcome correlation
   */
  getKnowledgeEffectiveness() {
    return this.db.prepare(`
      SELECT 
        mku.knowledge_type,
        mku.knowledge_key,
        COUNT(*) as times_used,
        AVG(mku.relevance_score) as avg_relevance,
        SUM(CASE WHEN lm.sentiment = 'positive' THEN 1 ELSE 0 END) as positive_outcomes,
        SUM(CASE WHEN lm.sentiment = 'negative' THEN 1 ELSE 0 END) as negative_outcomes
      FROM message_knowledge_usage mku
      JOIN lead_messages lm ON mku.message_id = lm.id
      GROUP BY mku.knowledge_type, mku.knowledge_key
      ORDER BY positive_outcomes DESC
    `).all();
  }

  // Contact operations
  getContacts(filters = {}) {
    let query = 'SELECT * FROM imported_contacts WHERE 1=1';
    const params = [];

    if (filters.status) {
      // Status is stored in the data JSON, for now skip this filter
      // Could be implemented by parsing JSON but would be slow
    }

    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    query += ' ORDER BY imported_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(parseInt(filters.offset));
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      title: row.title,
      company: row.company,
      companyDomain: row.company_domain,
      phone: row.phone,
      linkedinUrl: row.linkedin_url,
      source: row.source,
      importedAt: row.imported_at,
      data: this.safeParse(row.data, {})
    }));
  }

  getContactsCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM imported_contacts WHERE 1=1';
    const params = [];

    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params);

    return row ? row.count : 0;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
