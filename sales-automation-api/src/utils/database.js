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
    const stmt = this.db.prepare(`
      SELECT
        c.conversation_id,
        c.created_at,
        c.updated_at,
        COUNT(m.id) as message_count,
        (
          SELECT content
          FROM chat_messages
          WHERE conversation_id = c.conversation_id
          AND role = 'user'
          ORDER BY created_at ASC
          LIMIT 1
        ) as first_message
      FROM chat_conversations c
      LEFT JOIN chat_messages m ON c.conversation_id = m.conversation_id
      GROUP BY c.conversation_id
      ORDER BY c.updated_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
