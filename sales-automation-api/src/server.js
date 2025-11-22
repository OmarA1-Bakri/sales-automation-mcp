#!/usr/bin/env node

/**
 * Sales Automation API Server
 *
 * Main HTTP REST API for sales automation platform.
 * Orchestrates HubSpot, Explorium, lemlist integrations with B-mad workflows.
 *
 * Features:
 * - REST API for triggering workflows
 * - WebSocket for real-time updates
 * - Scheduled jobs (discovery, enrichment, outreach)
 * - Campaign management endpoints
 * - YOLO Mode support (fully autonomous)
 * - B-mad workflow engine (declarative YAML workflows)
 *
 * Usage:
 *   npm start                    # Production mode
 *   npm run dev                  # Development (auto-reload)
 *   npm run yolo                 # With YOLO mode enabled
 *   npm start -- --port 3000     # Custom port
 */

import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import Anthropic from '@anthropic-ai/sdk';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createLogger } from './utils/logger.js';
import { prototypePollutionMiddleware, freezeBuiltins } from './utils/prototype-protection.js';
import { AnthropicProvider } from './ai/AnthropicProvider.js';
import { GeminiProvider } from './ai/GeminiProvider.js';

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger('API');

// Freeze built-in prototypes to prevent pollution
freezeBuiltins();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import our clients
import { HubSpotClient } from './clients/hubspot-client.js';
import { LemlistClient } from './clients/lemlist-client.js';
import { ExploriumClient } from './clients/explorium-client.js';

// Import workers
import { ImportWorker } from './workers/import-worker.js';
import { EnrichmentWorker } from './workers/enrichment-worker.js';
import { CRMSyncWorker } from './workers/crm-sync-worker.js';

// Import utilities
import { Database } from './utils/database.js';
import { JobQueue } from './utils/job-queue.js';
import { RateLimiter } from './utils/rate-limiter.js';

// Import campaign management routes (Phase 6B)
import campaignRoutes from './routes/campaigns.js';
import { saveRawBody } from './middleware/webhook-auth.js';

// Import orphaned event queue for background processing
import OrphanedEventQueue from './services/OrphanedEventQueue.js';
import * as campaignController from './controllers/campaign-controller.js';

// Import database connection for health checks
import { sequelize } from './db/connection.js';

// Import validation middleware and schemas
import { validate } from './middleware/validate.js';
import { authenticate, hasApiKeys, getApiKeyCount } from './middleware/authenticate.js';
import { authenticateDb, requireScope, checkAuthHealth } from './middleware/authenticate-db.js';
import { csrfMiddleware, getCsrfTokenHandler } from './middleware/csrf-protection.js';
import apiKeysRoutes from './routes/api-keys.js';
import {
  DiscoverByICPSchema,
  DiscoverContactsSchema,
  EnrichContactSchema,
  EnrichContactsSchema,
  EnrichCompanySchema,
  SyncToHubSpotSchema,
  SyncCompanySchema,
  CreateCampaignSchema,
  EnrollInCampaignSchema,
  CreateJobSchema,
  GetJobsSchema,
  GetJobByIdSchema,
  UpdateJobSchema,
  CancelJobSchema,
  ImportContactsSchema,
  EnableYOLOSchema,
  UpdateYOLOConfigSchema,
  GetCampaignStatsSchema,
  CheckRepliesSchema,
} from './utils/validation-schemas.js';

// Import additional schemas from complete-schemas
import {
  GetDLQEventsSchema,
  ReplayDLQEventsSchema,
  GetDLQStatsSchema,
  ImportFromLemlistSchema,
  ImportFromHubSpotSchema,
  ImportFromCSVSchema,
  EnrichImportedContactsSchema,
  SyncToHubSpotSchema as SyncToHubSpotSchemaComplete,
  ListImportedContactsSchema,
  ChatMessageSchema,
  ChatHistorySchema,
  DisableYOLOSchema,
  GetYOLOStatusSchema
} from './validators/complete-schemas.js';

class SalesAutomationAPIServer {
  constructor(options = {}) {
    this.port = options.port || process.env.API_PORT || 3000;
    this.httpsPort = process.env.HTTPS_PORT || 3443;
    this.yoloMode = options.yolo || process.env.YOLO_MODE === 'true';
    this.enableHttps = options.enableHttps !== undefined ? options.enableHttps : process.env.ENABLE_HTTPS === 'true';

    // Initialize Express
    this.app = express();

    // Create HTTP server
    this.server = createServer(this.app);

    // Create HTTPS server if enabled
    if (this.enableHttps) {
      try {
        const httpsOptions = {
          key: fs.readFileSync(process.env.SSL_KEY_PATH),
          cert: fs.readFileSync(process.env.SSL_CERT_PATH),

          // TLS Configuration (OWASP/Mozilla Compliant)
          minVersion: process.env.TLS_MIN_VERSION || 'TLSv1.2',
          maxVersion: process.env.TLS_MAX_VERSION || 'TLSv1.3',

          // Strong cipher suites (prioritize ECDHE for Perfect Forward Secrecy)
          ciphers: [
            'ECDHE-ECDSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-ECDSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-ECDSA-CHACHA20-POLY1305',
            'ECDHE-RSA-CHACHA20-POLY1305',
            'DHE-RSA-AES128-GCM-SHA256',
            'DHE-RSA-AES256-GCM-SHA384'
          ].join(':'),

          // Prefer server cipher order
          honorCipherOrder: true
        };
        this.httpsServer = createHttpsServer(httpsOptions, this.app);
        logger.info('HTTPS enabled with TLS 1.2+');
      } catch (error) {
        logger.warn(`HTTPS disabled: ${error.message}`);
        this.httpsServer = null;
        this.enableHttps = false;
      }
    }

    // Initialize WebSocket (on HTTPS if enabled, otherwise HTTP)
    const wsServer = this.enableHttps && this.httpsServer ? this.httpsServer : this.server;
    this.wss = new WebSocketServer({ server: wsServer });

    // Initialize AI Provider
    const aiProviderType = process.env.AI_PROVIDER || 'anthropic';

    if (aiProviderType === 'gemini') {
      if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY not set, Gemini integration disabled');
      } else {
        this.aiProvider = new GeminiProvider({
          apiKey: process.env.GEMINI_API_KEY
        });
        logger.info('Using Gemini AI Provider');
      }
    } else {
      // Default to Anthropic
      if (!process.env.ANTHROPIC_API_KEY) {
        logger.warn('ANTHROPIC_API_KEY not set, Claude integration disabled');
      } else {
        this.aiProvider = new AnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        logger.info('Using Anthropic AI Provider');
      }
    }

    // Keep this.anthropic for backward compatibility if needed elsewhere, 
    // but ideally we should remove it. For now, we'll map it to the provider's client if it's Anthropic
    if (aiProviderType === 'anthropic' && this.aiProvider) {
      this.anthropic = this.aiProvider.client;
    } else {
      console.warn('⚠️  ANTHROPIC_API_KEY not set - Claude AI features disabled');
      this.anthropic = null;
    }

    // Initialize service clients (optional for testing)
    try {
      this.hubspot = new HubSpotClient();
    } catch (e) {
      console.warn('⚠️  HubSpot client disabled:', e.message);
      this.hubspot = null;
    }

    try {
      this.lemlist = new LemlistClient();
    } catch (e) {
      console.warn('⚠️  Lemlist client disabled:', e.message);
      this.lemlist = null;
    }

    try {
      this.explorium = new ExploriumClient();
    } catch (e) {
      console.warn('⚠️  Explorium client disabled:', e.message);
      this.explorium = null;
    }

    // Initialize utilities
    this.db = new Database();
    this.jobQueue = new JobQueue(this.db);
    this.rateLimiter = new RateLimiter();

    // Initialize workers
    this.importWorker = new ImportWorker({
      hubspot: this.hubspot,
      lemlist: this.lemlist,
      explorium: this.explorium
    }, this.db);

    // Initialize enrichment worker
    this.enrichmentWorker = new EnrichmentWorker({
      explorium: this.explorium,
      lemlist: this.lemlist
    }, this.db);

    // Initialize CRM sync worker
    this.crmSyncWorker = new CRMSyncWorker(
      this.hubspot,
      this.db
    );

    // State
    this.jobs = new Map();
    this.campaigns = new Map();
    this.cronJobs = [];
    this.orphanedEventProcessor = null;  // Interval for orphaned event queue processing

    // Model configuration
    this.models = {
      haiku: 'claude-3-5-haiku-20241022',    // Fast, efficient for most tasks
      sonnet: 'claude-3-5-sonnet-20241022',   // High intelligence for content creation
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventListeners();

    if (this.yoloMode) {
      this.setupYoloMode();
    }
  }

  /**
   * Setup Express middleware with security-critical ordering
   *
   * CRITICAL: Middleware order is essential for security. Changes to this order
   * must be carefully reviewed and tested. The layered approach ensures:
   * 1. Raw data is preserved before parsing
   * 2. Security headers are applied before processing
   * 3. Rate limiting prevents abuse before logging
   * 4. Public routes bypass authentication
   * 5. Protected routes require API keys
   *
   * @see test/integration/middleware-order.test.js for ordering tests
   */
  setupMiddleware() {
    const middlewareLogger = createLogger('Middleware');

    // ================================================================
    // LAYER 1: RAW BODY PRESERVATION
    // CRITICAL: Must be first to capture raw bytes for webhook signature verification
    // Saves req.rawBody before JSON parsing for HMAC validation
    // ================================================================
    this.app.use(express.json({
      limit: '10mb',
      verify: saveRawBody
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    middlewareLogger.info('✓ Layer 1: Raw body preservation enabled');

    // ================================================================
    // TRUST PROXY CONFIGURATION
    // Required for proper HTTPS detection behind reverse proxies (nginx/Caddy)
    // Enables req.secure, req.protocol, req.ip to work correctly
    // Only trust first proxy hop for security
    // ================================================================
    this.app.set('trust proxy', 1);
    middlewareLogger.info('✓ Trust proxy: Enabled (first hop)');

    // ================================================================
    // LAYER 2: PROTOCOL SECURITY
    // Redirects HTTP → HTTPS in production to ensure encrypted transport
    // Checks both req.secure and X-Forwarded-Proto header (for reverse proxies)
    // ================================================================
    if (this.enableHttps) {
      this.app.use((req, res, next) => {
        // Check both req.secure (Express) and X-Forwarded-Proto (reverse proxy)
        if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
          return next();
        }
        const httpsUrl = `https://${req.hostname}:${this.httpsPort}${req.url}`;
        middlewareLogger.debug('HTTP → HTTPS redirect', { from: req.url, to: httpsUrl });
        return res.redirect(301, httpsUrl);
      });
      middlewareLogger.info('✓ Layer 2: HTTPS redirect enabled');
    }

    // ================================================================
    // LAYER 3: SECURITY HEADERS
    // Sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
    // Prevents XSS, clickjacking, MIME sniffing, and other attacks
    // ================================================================
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      ieNoOpen: true,
      dnsPrefetchControl: { allow: false },
    }));
    middlewareLogger.info('✓ Layer 3: Security headers (Helmet) enabled');

    // ================================================================
    // LAYER 4: CORS CONFIGURATION
    // Single, centralized CORS configuration
    // Replaces duplicate CORS middleware that was causing conflicts
    // ================================================================
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3456', 'https://localhost:3443'];

    this.app.use(cors({
      origin: (origin, callback) => {
        try {
          // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
          if (!origin) return callback(null, true);

          // Check if origin is in allowed list
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else if (process.env.NODE_ENV === 'development') {
            // In development, only allow localhost/127.0.0.1 variations (not arbitrary domains)
            const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
            if (localhostPattern.test(origin)) {
              middlewareLogger.debug('CORS: Allowing development localhost origin', { origin });
              callback(null, true);
            } else {
              middlewareLogger.warn('CORS: Rejected non-localhost development origin', { origin });
              // Create error to trigger 403 response (fixes T2.7 CORS bypass vulnerability)
              const corsError = new Error('CORS policy violation: Origin not allowed');
              corsError.status = 403;
              callback(corsError);
            }
          } else {
            middlewareLogger.error('CORS: Blocked unauthorized origin', {
              origin,
              allowedOrigins,
              ip: 'unknown', // req not available in origin callback
              severity: 'CRITICAL',
              attackVector: 'CORS_BYPASS_ATTEMPT'
            });
            // Create error to trigger 403 response (fixes T2.7 CORS bypass vulnerability)
            const corsError = new Error('CORS policy violation: Origin not allowed');
            corsError.status = 403;
            callback(corsError);
          }
        } catch (error) {
          // CRITICAL: Catch any errors in CORS validation to prevent 500 responses
          middlewareLogger.error('CORS: Exception during origin validation', {
            error: error.message,
            stack: error.stack,
            origin,
            severity: 'CRITICAL'
          });
          // Create 403 error on validation failure - fail closed for security
          const corsError = new Error('CORS policy violation: Invalid origin');
          corsError.status = 403;
          callback(corsError);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
      exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge: 86400, // 24 hours
    }));

    // SECURITY FIX T2.7: CORS error handler - ensures 403 response instead of 500
    // This middleware catches CORS errors and returns proper 403 Forbidden responses
    this.app.use((err, req, res, next) => {
      if (err && err.message && err.message.includes('CORS policy violation')) {
        middlewareLogger.warn('CORS policy violation detected', {
          origin: req.headers.origin,
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'CORS policy violation: Origin not allowed',
          statusCode: 403
        });
      }
      next(err);
    });

    middlewareLogger.info('✓ Layer 4: CORS enabled with 403 error handling', { allowedOrigins });

    // ================================================================
    // LAYER 5: RATE LIMITING
    // CRITICAL: Must be BEFORE logging to prevent log flooding attacks
    // Attackers could DOS by filling disk with logs without rate limiting
    // ================================================================
    const limiter = rateLimit({
      windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      message: {
        success: false,
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
      handler: (req, res) => {
        const rateLimitLogger = createLogger('RateLimit');
        rateLimitLogger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `You have exceeded the ${req.rateLimit.limit} requests per ${process.env.RATE_LIMIT_WINDOW || 15} minute limit.`,
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          timestamp: new Date().toISOString(),
        });
      },
    });
    this.app.use(limiter);
    middlewareLogger.info('✓ Layer 5: Rate limiting enabled (100 req/15min)');

    // ================================================================
    // LAYER 6: INPUT VALIDATION & SANITIZATION
    // Prototype pollution protection - blocks malicious __proto__ keys
    // ================================================================
    this.app.use(prototypePollutionMiddleware);
    middlewareLogger.info('✓ Layer 6: Prototype pollution protection enabled');

    // ================================================================
    // LAYER 7: OBSERVABILITY
    // Request logging (AFTER rate limiting to avoid log flooding)
    // ================================================================
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        middlewareLogger.info('Request completed', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip
        });
      });
      next();
    });
    middlewareLogger.info('✓ Layer 7: Request logging enabled');

    // ================================================================
    // LAYER 8: PUBLIC ROUTES (No authentication required)
    // Health check, static dashboard, webhook endpoints
    // These routes are accessible without API keys
    // ================================================================
    this.app.use('/dashboard', express.static(join(__dirname, '../public')));
    middlewareLogger.info('✓ Layer 8: Public routes enabled (/health, /dashboard, /webhooks/*)');

    // ================================================================
    // LAYER 9: API AUTHENTICATION
    // All /api/* routes require valid API key
    // Uses database-backed authentication with Argon2id hashing
    // Falls back to .env keys if database auth fails (for migration period)
    // Webhooks use their own signature verification (not API keys)
    // Static files and health checks bypass this middleware
    // ================================================================
    // Cache database availability check to avoid repeated timeouts
    let dbAuthAvailable = true;
    let lastDbCheck = 0;
    const DB_CHECK_INTERVAL = 30000; // Check every 30 seconds

    // Use database authentication for all /api/* routes except /api/keys (which needs it explicitly)
    this.app.use('/api', async (req, res, next) => {
      // Check if response was already sent (e.g., by public endpoint bypass)
      if (res.headersSent) {
        return;
      }

      // Check DB availability periodically (not on every request)
      const now = Date.now();
      if (now - lastDbCheck > DB_CHECK_INTERVAL) {
        try {
          // Quick connection check with 1 second timeout
          await Promise.race([
            sequelize.authenticate(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB check timeout')), 1000))
          ]);
          dbAuthAvailable = true;
        } catch (dbError) {
          middlewareLogger.warn('Database connection failed, using env-based auth', { error: dbError.message });
          dbAuthAvailable = false;
        }
        lastDbCheck = now;
      }

      if (dbAuthAvailable) {
        try {
          await authenticateDb(req, res, next);
        } catch (dbAuthError) {
          // Only fallback if response wasn't already sent
          if (!res.headersSent) {
            middlewareLogger.warn('Database auth error, falling back to .env auth', { error: dbAuthError.message });
            authenticate(req, res, next);
          }
        }
      } else {
        // Use env-based auth directly
        authenticate(req, res, next);
      }
    });
    middlewareLogger.info('✓ Layer 9: Database-backed API authentication enabled for /api/*');

    // ================================================================
    // LAYER 10: CSRF PROTECTION
    // Double Submit Cookie pattern with Redis-backed token storage
    // Protects all state-changing operations (POST/PUT/DELETE/PATCH)
    // Exempts webhooks (signature-verified) and safe methods (GET/HEAD/OPTIONS)
    // Applied AFTER authentication so we have session/API key context
    // ================================================================
    this.app.use(csrfMiddleware({
      tokenTTL: parseInt(process.env.CSRF_TOKEN_TTL) || 3600000,  // 1 hour
      rotation: process.env.CSRF_ROTATION || 'per-session',
      enforce: process.env.CSRF_ENFORCE !== 'false'
    }));
    middlewareLogger.info('✓ Layer 10: CSRF protection enabled (Double Submit Cookie pattern)');

    middlewareLogger.info('All middleware layers initialized successfully');
  }

  setupRoutes() {
    // Health check with queue status (FIX #5: Monitoring)
    this.app.get('/health', async (req, res) => {
      try {
        // Get queue status with timeout protection
        const queueStatusPromise = OrphanedEventQueue.getStatus();
        const queueTimeout = new Promise((resolve) =>
          setTimeout(() => resolve({ healthy: false, error: 'timeout' }), 5000)
        );
        const queueStatus = await Promise.race([queueStatusPromise, queueTimeout]);

        logger.debug('[Health Endpoint] Queue status received', { queueStatus });

        // Get auth health with timeout protection
        const authHealthPromise = checkAuthHealth();
        const authTimeout = new Promise((resolve) =>
          setTimeout(() => resolve({ status: 'degraded', error: 'timeout' }), 5000)
        );
        const authHealth = await Promise.race([authHealthPromise, authTimeout]);

        logger.debug('[Health Endpoint] Auth health received', { authHealth });

        const overallHealthy = queueStatus.healthy && authHealth.status === 'healthy';

        logger.debug('[Health Endpoint] Computed health', { 
          queueHealthy: queueStatus.healthy,
          authStatus: authHealth.status,
          overallHealthy 
        });

        const responseObj = {
          status: overallHealthy ? 'ok' : 'degraded',
          service: 'sales-automation-api',
          version: '1.0.0',
          yoloMode: this.yoloMode,
          timestamp: new Date().toISOString(),
          components: {
            orphanedQueue: queueStatus,
            authentication: authHealth
          }
        };

        logger.debug('[Health Endpoint] SENDING RESPONSE', responseObj);

        res.json(responseObj);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          service: 'sales-automation-api',
          version: '1.0.0',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Prometheus metrics endpoint (FIX #5: Monitoring)
    this.app.get('/metrics', async (req, res) => {
      try {
        const { metrics } = await import('./utils/metrics.js');
        const prometheusMetrics = await metrics.getMetrics();

        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(prometheusMetrics);
      } catch (error) {
        logger.error('Error generating metrics', { error: error.message });
        res.status(500).send('# Error generating metrics\n');
      }
    });

    // ========================================================================
    // DEAD LETTER QUEUE ADMIN ENDPOINTS (FIX #6)
    // ========================================================================

    // List dead letter events
    this.app.get('/api/admin/dlq', validate(GetDLQEventsSchema), async (req, res) => {
      try {
        const { DeadLetterEvent } = await import('./models/index.js');
        const { status, limit = 100, offset = 0 } = req.validatedQuery;

        const where = status ? { status } : {};

        const events = await DeadLetterEvent.findAll({
          where,
          limit: Math.min(parseInt(limit), 1000),
          offset: parseInt(offset),
          order: [['created_at', 'DESC']]
        });

        const total = await DeadLetterEvent.count({ where });

        res.json({
          success: true,
          data: events,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + events.length) < total
          }
        });

      } catch (error) {
        logger.error('Error fetching dead letter events', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Replay dead letter event(s)
    this.app.post('/api/admin/dlq/replay', validate(ReplayDLQEventsSchema), async (req, res) => {
      try {
        const { DeadLetterEvent } = await import('./models/index.js');
        const { eventIds } = req.validatedBody;

        // Validation handled by Zod middleware
        const results = [];

        for (const eventId of eventIds) {
          try {
            const dlqEvent = await DeadLetterEvent.findByPk(eventId);

            if (!dlqEvent) {
              results.push({
                eventId,
                success: false,
                error: 'Event not found'
              });
              continue;
            }

            if (dlqEvent.status !== 'failed') {
              results.push({
                eventId,
                success: false,
                error: `Event status is ${dlqEvent.status}, can only replay failed events`
              });
              continue;
            }

            // Update status to replaying
            await dlqEvent.update({ status: 'replaying' });

            // Re-enqueue the event
            await OrphanedEventQueue.enqueue(dlqEvent.event_data);

            // Update status to replayed
            await dlqEvent.update({
              status: 'replayed',
              replayed_at: new Date()
            });

            results.push({
              eventId,
              success: true,
              message: 'Event re-queued for processing'
            });

            logger.info('Dead letter event replayed', {
              dlqId: eventId,
              email: dlqEvent.email,
              eventType: dlqEvent.event_type
            });

          } catch (error) {
            logger.error('Error replaying dead letter event', {
              eventId,
              error: error.message
            });

            results.push({
              eventId,
              success: false,
              error: error.message
            });
          }
        }

        res.json({
          success: true,
          results,
          summary: {
            total: results.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        });

      } catch (error) {
        logger.error('Error in DLQ replay endpoint', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get DLQ statistics
    this.app.get('/api/admin/dlq/stats', validate(GetDLQStatsSchema), async (req, res) => {
      try {
        const { DeadLetterEvent, sequelize } = await import('./models/index.js');

        const stats = await DeadLetterEvent.findAll({
          attributes: [
            'status',
            'event_type',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['status', 'event_type'],
          raw: true
        });

        const totalByStatus = await DeadLetterEvent.findAll({
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['status'],
          raw: true
        });

        res.json({
          success: true,
          data: {
            byStatusAndType: stats,
            byStatus: totalByStatus
          }
        });

      } catch (error) {
        logger.error('Error fetching DLQ stats', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // ========================================================================
    // WORKFLOW ENDPOINTS
    // ========================================================================

    // Discover leads
    this.app.post('/api/discover', validate(DiscoverByICPSchema), async (req, res) => {
      try {
        const validated = req.validatedData;

        const jobId = await this.executeWorkflow('discover', {
          query: validated.query,
          icpProfileName: validated.icpProfileName,
          count: validated.count,
          minScore: validated.minScore,
          geography: validated.geography,
          excludeExisting: validated.excludeExisting,
        });

        res.json({
          success: true,
          jobId,
          message: 'Discovery job started',
          status: `/api/jobs/${jobId}`,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Enrich contacts
    this.app.post('/api/enrich', validate(EnrichContactsSchema), async (req, res) => {
      try {
        const validated = req.validatedData;

        const jobId = await this.executeWorkflow('enrich', {
          contacts: validated.contacts,
          sources: validated.sources,
          cacheEnabled: validated.cacheEnabled,
          minQuality: validated.minQuality,
          parallel: validated.parallel,
          batchSize: validated.batchSize,
        });

        res.json({
          success: true,
          jobId,
          message: 'Enrichment job started',
          status: `/api/jobs/${jobId}`,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Launch outreach
    this.app.post('/api/outreach', validate(EnrollInCampaignSchema), async (req, res) => {
      try {
        const validated = req.validatedData;

        const jobId = await this.executeWorkflow('outreach', {
          campaignId: validated.campaignId,
          leads: validated.leads,
          skipUnsubscribed: validated.skipUnsubscribed,
          skipBounced: validated.skipBounced,
        });

        res.json({
          success: true,
          jobId,
          message: 'Outreach job started',
          status: `/api/jobs/${jobId}`,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Monitor campaigns
    this.app.get('/api/monitor', async (req, res) => {
      try {
        const stats = await this.getSystemStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // System stats (alias for /api/monitor for backward compatibility)
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.getSystemStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ========================================================================
    // YOLO MODE ENDPOINTS
    // ========================================================================

    // Enable YOLO mode
    this.app.post('/api/yolo/enable', validate(EnableYOLOSchema), async (req, res) => {
      try {
        const validated = req.validatedData;
        await this.enableYoloMode(validated);
        res.json({
          success: true,
          message: 'YOLO Mode enabled',
          schedule: 'Daily at 8:00 AM',
          config: validated,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Disable YOLO mode
    this.app.post('/api/yolo/disable', async (req, res) => {
      try {
        await this.disableYoloMode();
        res.json({
          success: true,
          message: 'YOLO Mode disabled',
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // YOLO status
    this.app.get('/api/yolo/status', async (req, res) => {
      try {
        const status = await this.getYoloStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ========================================================================
    // CAMPAIGN MANAGEMENT (Phase 6B - PostgreSQL-based)
    // ========================================================================

    /**
     * Database Health Check Middleware
     * Ensures database is available before processing campaign requests
     * Returns 503 Service Unavailable if database is down
     */
    const dbHealthCheck = async (req, res, next) => {
      try {
        await sequelize.authenticate();
        next();
      } catch (error) {
        logger.error('Database health check failed', { error: error.message });
        res.status(503).json({
          success: false,
          error: 'Database unavailable',
          message: 'Campaign service temporarily unavailable. Please try again later.',
          statusCode: 503
        });
      }
    };

    // Mount campaign routes under /api/campaigns/v2 to avoid conflict with Lemlist routes
    // These routes handle templates, instances, sequences, enrollments, and events
    // DB health check runs before all campaign operations
    this.app.use('/api/campaigns/v2', dbHealthCheck, campaignRoutes);

    // Also mount at /api/campaigns for backward compatibility (webhooks, etc.)
    // Tests and existing integrations use this path
    // NOTE: No dbHealthCheck here to allow tests with disabled DB to access webhook endpoints
    this.app.use('/api/campaigns', campaignRoutes);

    // ========================================================================
    // CSRF TOKEN ENDPOINT
    // ========================================================================
    // GET /api/csrf-token - Get CSRF token for authenticated session
    // Required for client-side applications to obtain tokens
    this.app.get('/api/csrf-token', getCsrfTokenHandler);

    // ========================================================================
    // API KEY MANAGEMENT (T2.11)
    // ========================================================================
    // Mount API key management routes
    // These routes handle key creation, rotation, revocation, and audit logs
    // Requires admin:keys scope for all operations
    this.app.use('/api/keys', dbHealthCheck, apiKeysRoutes);

    // ========================================================================
    // JOB MANAGEMENT
    // ========================================================================

    // Get job status
    this.app.get('/api/jobs/:jobId', validate(GetJobByIdSchema), async (req, res) => {
      try {
        const validated = req.validatedData;
        const job = await this.jobQueue.getStatus(validated.jobId);
        res.json(job);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // List all jobs
    this.app.get('/api/jobs', validate(GetJobsSchema), async (req, res) => {
      try {
        const validated = req.validatedData;
        const jobs = await this.db.listJobs({
          status: validated.status,
          type: validated.type,
          priority: validated.priority,
          limit: validated.limit,
          offset: validated.offset,
        });
        res.json({ success: true, jobs });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Cancel job
    this.app.delete('/api/jobs/:jobId', validate(CancelJobSchema), async (req, res) => {
      try {
        const validated = req.validatedData;
        await this.jobQueue.cancel(validated.jobId, validated.reason);
        res.json({
          success: true,
          message: 'Job cancelled',
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ========================================================================
    // CAMPAIGN MANAGEMENT
    // ========================================================================

    // List campaigns
    this.app.get('/api/campaigns', async (req, res) => {
      try {
        const campaigns = await this.lemlist.getCampaigns();
        res.json(campaigns);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get campaign stats
    this.app.get('/api/campaigns/:campaignId/stats', validate(GetCampaignStatsSchema), async (req, res) => {
      try {
        const validated = req.validatedData;
        const stats = await this.lemlist.getCampaignStats(
          validated.campaignId,
          {
            startDate: validated.startDate,
            endDate: validated.endDate,
          }
        );
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ========================================================================
    // IMPORT
    // ========================================================================

    // Import from Lemlist
    this.app.post('/api/import/lemlist', authenticate, async (req, res) => {
      try {
        const { campaignId, status, limit, deduplicate } = req.body;

        const result = await this.importWorker.importFromLemlist({
          campaignId,
          status,
          limit: limit || 1000,
          deduplicate: deduplicate !== false
        });

        res.json(result);
      } catch (error) {
        logger.error(`[Import] Lemlist import failed: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Import from HubSpot
    this.app.post('/api/import/hubspot', authenticate, async (req, res) => {
      try {
        const { listId, filters, properties, limit, deduplicate } = req.body;

        const result = await this.importWorker.importFromHubSpot({
          listId,
          filters: filters || [],
          properties: properties || ['email', 'firstname', 'lastname', 'jobtitle', 'company'],
          limit: limit || 1000,
          deduplicate: deduplicate !== false
        });

        res.json(result);
      } catch (error) {
        logger.error(`[Import] HubSpot import failed: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Import from CSV (accepts CSV data in request body)
    this.app.post('/api/import/csv', authenticate, async (req, res) => {
      try {
        const { csvData, fieldMapping, deduplicate } = req.body;

        if (!csvData) {
          return res.status(400).json({
            success: false,
            error: 'CSV data is required'
          });
        }

        // Write CSV data to temporary file
        const tempDir = join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFile = join(tempDir, `import-${Date.now()}.csv`);
        fs.writeFileSync(tempFile, csvData);

        try {
          const result = await this.importWorker.importFromCSV({
            filePath: tempFile,
            fieldMapping: fieldMapping || null,
            skipHeader: true,
            deduplicate: deduplicate !== false
          });

          // Clean up temp file
          fs.unlinkSync(tempFile);

          res.json(result);
        } catch (error) {
          // Clean up temp file on error
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          throw error;
        }
      } catch (error) {
        logger.error(`[Import] CSV import failed: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Enrich contacts with Explorium data (direct call, not job-based)
    this.app.post('/api/import/enrich', authenticate, async (req, res) => {
      try {
        const { contacts, options = {} } = req.body;

        if (!contacts || !Array.isArray(contacts)) {
          return res.status(400).json({
            success: false,
            error: 'contacts array is required'
          });
        }

        const result = await this.enrichmentWorker.enrichContacts(contacts, {
          cache: options.cache !== false,
          includeCompany: options.includeCompany !== false,
          includeIntelligence: options.includeIntelligence !== false
        });

        res.json(result);
      } catch (error) {
        logger.error(`[Enrich] Enrichment failed: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Sync enriched contacts to HubSpot (direct call, not job-based)
    this.app.post('/api/import/sync/hubspot', authenticate, async (req, res) => {
      try {
        const { contacts, options = {} } = req.body;

        if (!contacts || !Array.isArray(contacts)) {
          return res.status(400).json({
            success: false,
            error: 'contacts array is required'
          });
        }

        const result = await this.crmSyncWorker.batchSyncContacts(contacts, {
          deduplicate: options.deduplicate !== false,
          createIfNew: options.createIfNew !== false,
          updateIfExists: options.updateIfExists !== false,
          associateCompany: options.associateCompany !== false,
          logActivity: options.logActivity !== false
        });

        res.json(result);
      } catch (error) {
        logger.error(`[Sync] HubSpot sync failed: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get contacts from database with filters (for import workflow)
    this.app.get('/api/import/contacts', authenticate, async (req, res) => {
      try {
        const {
          status,      // imported, enriched, synced
          source,      // csv, lemlist, hubspot
          limit = 100,
          offset = 0
        } = req.query;

        // Query database for contacts
        // Note: You'll need to implement getContacts() in database.js
        const contacts = this.db.getContacts({
          status,
          source,
          limit: parseInt(limit),
          offset: parseInt(offset)
        });

        res.json({
          success: true,
          contacts: contacts || [],
          count: contacts ? contacts.length : 0
        });
      } catch (error) {
        logger.error(`[Contacts] Failed to get contacts: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ========================================================================
    // AI CHAT
    // ========================================================================

    // Chat-specific rate limiter (more restrictive to protect Claude API quota)
    const chatLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.CHAT_RATE_LIMIT_MAX) || 10, // Default 10 messages per minute
      message: {
        success: false,
        error: 'Chat rate limit exceeded',
        message: 'You are sending messages too quickly. Please wait a moment before trying again.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`[Chat] Rate limit exceeded from ${req.ip}`);
        res.status(429).json({
          success: false,
          error: 'Chat rate limit exceeded',
          message: `You have exceeded the ${req.rateLimit.limit} messages per minute limit. Please wait before sending another message.`,
          retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Chat endpoint - AI assistant for sales automation
    this.app.post('/api/chat', authenticateDb, chatLimiter, async (req, res) => {
      try {
        const { message, conversationId = null } = req.body;

        // Check if Claude API is configured
        if (!this.anthropic) {
          return res.status(503).json({
            success: false,
            error: 'Claude AI service not configured. Please set ANTHROPIC_API_KEY environment variable.'
          });
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'message is required and must be a non-empty string'
          });
        }

        // Validate conversation ID format if provided
        if (conversationId && !/^conv_\d+_[a-z0-9]{9}$/.test(conversationId)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid conversation ID format'
          });
        }

        // Get conversation history if conversationId provided
        let conversationHistory = [];
        if (conversationId) {
          conversationHistory = this.db.getChatHistory(conversationId) || [];
        }

        // Build messages array for Claude API
        const messages = [
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: message
          }
        ];

        // System prompt for sales automation assistant
        const systemPrompt = `You are an AI assistant for a sales automation platform. You help users with:

- Lead discovery and ICP matching
- Contact and company enrichment
- CRM synchronization
- Campaign management
- Performance analytics
- Workflow automation

You have access to the following tools via the API:
- /api/discover: Find companies matching ICP criteria
- /api/enrich: Enrich contacts with Explorium data
- /api/sync: Sync contacts to HubSpot
- /api/campaigns: Manage email campaigns
- /api/import: Import contacts from CSV or Lemlist

When users ask about these features, provide helpful guidance and suggest the appropriate API endpoints or workflows.

Current system status:
- YOLO Mode: ${this.yoloMode ? 'enabled' : 'disabled'}
- Active campaigns: Use /api/campaigns to check
- Recent jobs: Use /api/jobs to check

Be concise, helpful, and action-oriented. Suggest concrete next steps when appropriate.`;

        // Call Claude API
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 2048,
          system: systemPrompt,
          messages: messages
        });

        const assistantMessage = response.content[0].text;

        // Generate or use conversation ID
        const finalConversationId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store conversation in database
        this.db.saveChatMessage(finalConversationId, 'user', message);
        this.db.saveChatMessage(finalConversationId, 'assistant', assistantMessage);

        res.json({
          success: true,
          message: assistantMessage,
          conversationId: finalConversationId,
          metadata: {
            model: 'claude-3-5-haiku-20241022',
            tokens: response.usage
          }
        });

      } catch (error) {
        logger.error(`[Chat] Chat request failed: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get chat history
    this.app.get('/api/chat/history', authenticate, async (req, res) => {
      try {
        const { conversationId = null } = req.query;

        if (conversationId) {
          // Get specific conversation
          const history = this.db.getChatHistory(conversationId);
          res.json({
            success: true,
            conversationId,
            messages: history || []
          });
        } else {
          // List all conversations
          const conversations = this.db.listConversations();
          res.json({
            success: true,
            conversations: conversations || []
          });
        }
      } catch (error) {
        logger.error(`[Chat] Failed to get chat history: ${error.message}`);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // ========================================================================
    // DASHBOARD
    // ========================================================================

    this.app.get('/', (req, res) => {
      res.redirect('/dashboard');
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      logger.info('[WebSocket] Client connected');

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Sales Automation API',
        yoloMode: this.yoloMode,
      }));

      ws.on('close', () => {
        logger.info('[WebSocket] Client disconnected');
      });

      ws.on('error', (error) => {
        logger.error(`[WebSocket] Connection error: ${error.message}`);
        ws.terminate();
      });
    });
  }

  setupEventListeners() {
    // Read environment configuration for automation
    const autoEnrichOnImport = process.env.AUTO_ENRICH_ON_IMPORT === 'true';
    const autoSyncAfterEnrich = process.env.AUTO_SYNC_AFTER_ENRICH === 'true';

    logger.info('[Automation] Event listeners configured:');
    logger.info(`  - Auto-enrich on import: ${autoEnrichOnImport}`);
    logger.info(`  - Auto-sync after enrich: ${autoSyncAfterEnrich}`);

    // Event 1: contacts-imported → auto-enrich
    if (autoEnrichOnImport) {
      this.importWorker.on('contacts-imported', async (data) => {
        const { source, contacts, count } = data;

        try {
          logger.info(`[Automation] Auto-enriching ${count} contacts from ${source}...`);

          // Broadcast to UI
          this.broadcast({
            type: 'automation.enrich.started',
            source,
            count,
            timestamp: new Date().toISOString(),
          });

          // Trigger enrichment
          const enrichResult = await this.enrichmentWorker.enrichContacts(contacts, {
            cache: true,
            includeCompany: true,
            includeIntelligence: true,
          });

          logger.info(`[Automation] Enriched ${enrichResult.enriched.length}/${count} contacts`);

          // Broadcast completion
          this.broadcast({
            type: 'automation.enrich.completed',
            source,
            total: count,
            enriched: enrichResult.enriched.length,
            failed: enrichResult.failed.length,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          logger.error(`[Automation] Auto-enrichment failed: ${error.message}`);

          this.broadcast({
            type: 'automation.enrich.failed',
            source,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    // Event 2: contacts-enriched → auto-sync
    if (autoSyncAfterEnrich) {
      this.enrichmentWorker.on('contacts-enriched', async (data) => {
        const { contacts, count } = data;

        try {
          logger.info(`[Automation] Auto-syncing ${count} enriched contacts to HubSpot...`);

          // Broadcast to UI
          this.broadcast({
            type: 'automation.sync.started',
            count,
            timestamp: new Date().toISOString(),
          });

          // Trigger sync
          const syncResult = await this.crmSyncWorker.batchSyncContacts(contacts, {
            deduplicate: true,
            createIfNew: true,
            updateIfExists: true,
            associateCompany: true,
            logActivity: true,
          });

          logger.info(`[Automation] Synced ${syncResult.synced}/${count} contacts to HubSpot`);

          // Broadcast completion
          this.broadcast({
            type: 'automation.sync.completed',
            total: count,
            synced: syncResult.synced,
            failed: syncResult.failed,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          logger.error(`[Automation] Auto-sync failed: ${error.message}`);

          this.broadcast({
            type: 'automation.sync.failed',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  }

  broadcast(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  setupYoloMode() {
    console.log('[YOLO Mode] Setting up autonomous operation...');

    // Daily discovery & outreach at 8am
    const dailyJob = cron.schedule('0 8 * * *', async () => {
      console.log('[YOLO Mode] Starting daily autonomous cycle...');

      try {
        // 1. Discover
        const discoverJobId = await this.executeWorkflow('discover', {
          query: 'Find 50 PSP treasury leaders matching ICP',
          icpProfile: 'icp_rtgs_psp_treasury',
          limit: 50,
        });

        this.broadcast({
          type: 'yolo.discovery.started',
          jobId: discoverJobId,
          timestamp: new Date().toISOString(),
        });

        // Wait for discovery to complete (poll)
        await this.waitForJob(discoverJobId);

        // 2. Enrich
        const enrichJobId = await this.executeWorkflow('enrich', {
          jobId: discoverJobId,
          sources: ['explorium'],
        });

        this.broadcast({
          type: 'yolo.enrichment.started',
          jobId: enrichJobId,
          timestamp: new Date().toISOString(),
        });

        await this.waitForJob(enrichJobId);

        // 3. Outreach
        const outreachJobId = await this.executeWorkflow('outreach', {
          jobId: enrichJobId,
          autoSelect: true,
        });

        this.broadcast({
          type: 'yolo.outreach.started',
          jobId: outreachJobId,
          timestamp: new Date().toISOString(),
        });

        console.log('[YOLO Mode] Daily cycle complete');
      } catch (error) {
        console.error('[YOLO Mode] Error in daily cycle:', error);
        this.broadcast({
          type: 'yolo.error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Monitor campaigns every 2 hours
    const monitorJob = cron.schedule('0 */2 * * *', async () => {
      console.log('[YOLO Mode] Checking campaigns...');

      try {
        const campaigns = await this.lemlist.getCampaigns();

        for (const campaign of campaigns.campaigns || []) {
          const stats = await this.lemlist.getCampaignStats(campaign.id);

          // Check for hot leads
          if (stats.stats?.replied > 0) {
            this.broadcast({
              type: 'yolo.hot_leads',
              campaign: campaign.name,
              replies: stats.stats.replied,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('[YOLO Mode] Error monitoring campaigns:', error);
      }
    });

    this.cronJobs.push(dailyJob, monitorJob);
    console.log('[YOLO Mode] Autonomous operation enabled');
  }

  async executeWorkflow(type, params) {
    // Create job in database (enqueue takes: type, parameters, priority)
    const job = await this.jobQueue.enqueue(type, params, 'normal');

    // Execute via Claude API in background
    this.processJobAsync(job.id, type, params);

    return job.id;
  }

  async processJobAsync(jobId, type, params) {
    try {
      // Check if AI service is configured
      if (!this.aiProvider) {
        throw new Error('AI service not configured. Please set ANTHROPIC_API_KEY or GEMINI_API_KEY environment variable.');
      }

      // Update status
      await this.db.updateJobStatus(jobId, 'processing');

      this.broadcast({
        type: 'job.started',
        jobId,
        workflowType: type,
        timestamp: new Date().toISOString(),
      });

      // Load appropriate agent prompt
      const agentPrompt = await this.loadAgentPrompt(type);

      // Select appropriate model for this task
      const model = this.selectModel(type);

      // Get tools for this workflow
      const tools = this.getToolDefinitions(type);

      // Execute via AI Provider
      const response = await this.aiProvider.generateText(
        agentPrompt,
        JSON.stringify(params), // User prompt is the params
        model,
        tools
      );

      // Process tool calls from response
      const result = await this.processToolCalls(response, type, params);

      // Update job with result
      await this.db.updateJobStatus(jobId, 'completed', result);

      this.broadcast({
        type: 'job.completed',
        jobId,
        result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error(`[Job ${jobId}] Error:`, error);

      await this.db.updateJobStatus(jobId, 'failed', null, error.message);

      this.broadcast({
        type: 'job.failed',
        jobId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Select the appropriate Claude model based on task type
   * Haiku (4-5): Fast, efficient for routine tasks (discovery, enrichment, sync)
   * Sonnet (4-5): High intelligence for content creation and complex reasoning
   */
  selectModel(type) {
    // Use Sonnet for high-intelligence tasks
    const sonnetTasks = [
      'outreach',      // Email/message content creation
      'personalize',   // Personalization and copywriting
      'optimize',      // Campaign optimization decisions
      'analyze',       // Complex data analysis
    ];

    return sonnetTasks.includes(type) ? this.models.sonnet : this.models.haiku;
  }

  async loadAgentPrompt(type) {
    const agentMap = {
      discover: 'lead-finder.md',
      enrich: 'enrichment-specialist.md',
      outreach: 'outreach-coordinator.md',
      monitor: 'sales-orchestrator.md',
    };

    const filename = agentMap[type];
    if (!filename) {
      throw new Error(`Unknown workflow type: ${type}`);
    }

    const promptPath = join(__dirname, '../agents', filename);
    return fs.readFileSync(promptPath, 'utf-8');
  }

  getToolDefinitions(type) {
    // Return tool definitions based on workflow type
    // This would include HubSpot, Lemlist, Explorium tools
    const tools = [];

    if (['discover', 'enrich'].includes(type)) {
      tools.push({
        name: 'explorium_enrich_company',
        description: 'Enrich company data via Explorium',
        input_schema: {
          type: 'object',
          properties: {
            domain: { type: 'string' },
          },
          required: ['domain'],
        },
      });
    }

    if (['enrich', 'outreach'].includes(type)) {
      tools.push({
        name: 'hubspot_create_contact',
        description: 'Create contact in HubSpot',
        input_schema: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
          required: ['email'],
        },
      });
    }

    if (type === 'outreach') {
      tools.push({
        name: 'lemlist_add_lead',
        description: 'Add lead to lemlist campaign',
        input_schema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['campaignId', 'email'],
        },
      });
    }

    return tools;
  }

  async processToolCalls(response, type, params) {
    // Process Claude's tool calls and execute them
    const results = [];

    for (const content of response.content) {
      if (content.type === 'tool_use') {
        const toolResult = await this.executeTool(content.name, content.input);
        results.push(toolResult);
      }
    }

    return results;
  }

  async executeTool(toolName, input) {
    // Route tool calls to appropriate clients
    if (toolName.startsWith('hubspot_')) {
      return await this.executeHubSpotTool(toolName, input);
    }

    if (toolName.startsWith('lemlist_')) {
      return await this.executeLemlistTool(toolName, input);
    }

    if (toolName.startsWith('explorium_')) {
      return await this.executeExploriumTool(toolName, input);
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }

  async executeHubSpotTool(toolName, input) {
    const method = toolName.replace('hubspot_', '');

    switch (method) {
      case 'create_contact':
        return await this.hubspot.createContact(input);
      case 'update_contact':
        return await this.hubspot.updateContact(input.contactId, input.properties);
      case 'search_contacts':
        return await this.hubspot.searchContacts(input);
      default:
        throw new Error(`Unknown HubSpot tool: ${toolName}`);
    }
  }

  async executeLemlistTool(toolName, input) {
    const method = toolName.replace('lemlist_', '');

    switch (method) {
      case 'add_lead':
        return await this.lemlist.addLead(input);
      case 'create_campaign':
        return await this.lemlist.createCampaign(input);
      case 'get_campaign_stats':
        return await this.lemlist.getCampaignStats(input.campaignId);
      default:
        throw new Error(`Unknown Lemlist tool: ${toolName}`);
    }
  }

  async executeExploriumTool(toolName, input) {
    const method = toolName.replace('explorium_', '');

    switch (method) {
      case 'enrich_company':
        return await this.explorium.enrichCompany(input);
      case 'enrich_contact':
        return await this.explorium.enrichContact(input);
      case 'discover_companies':
        return await this.explorium.discoverCompanies(input);
      default:
        throw new Error(`Unknown Explorium tool: ${toolName}`);
    }
  }

  async waitForJob(jobId, timeout = 300000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.jobQueue.getStatus(jobId);

      if (job.status === 'completed') {
        return job.result;
      }

      if (job.status === 'failed') {
        throw new Error(`Job failed: ${job.error}`);
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Job timeout');
  }

  async getSystemStats() {
    // Get job stats
    const jobs = this.db.getJobStats();

    // Get campaigns (safely handle null client)
    let campaigns = { count: 0 };
    if (this.lemlist) {
      try {
        campaigns = await this.lemlist.getCampaigns();
      } catch (error) {
        console.warn('Failed to get campaigns:', error.message);
      }
    }

    // Check health of integrations (safely handle null clients)
    const hubspotHealth = this.hubspot ? await this.hubspot.healthCheck().catch(() => ({ status: 'error' })) : { status: 'disabled' };
    const lemlistHealth = this.lemlist ? await this.lemlist.healthCheck().catch(() => ({ status: 'error' })) : { status: 'disabled' };
    const exploriumHealth = this.explorium ? await this.explorium.healthCheck().catch(() => ({ status: 'error' })) : { status: 'disabled' };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      yoloMode: this.yoloMode,
      jobs,
      campaigns: campaigns.count || 0,
      integrations: {
        hubspot: hubspotHealth.status,
        lemlist: lemlistHealth.status,
        explorium: exploriumHealth.status,
      },
    };
  }

  async enableYoloMode() {
    if (this.yoloMode) {
      throw new Error('YOLO Mode already enabled');
    }

    this.yoloMode = true;
    this.setupYoloMode();

    console.log('[YOLO Mode] Enabled');
  }

  async disableYoloMode() {
    if (!this.yoloMode) {
      throw new Error('YOLO Mode not enabled');
    }

    // Stop cron jobs
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];

    this.yoloMode = false;
    console.log('[YOLO Mode] Disabled');
  }

  async getYoloStatus() {
    return {
      success: true,
      enabled: this.yoloMode,
      nextRun: this.yoloMode ? 'Tomorrow at 8:00 AM' : 'N/A',
      stats: await this.getSystemStats(),
    };
  }

  async start() {
    // Initialize database first
    await this.db.initialize();
    console.log('✓ Database initialized');

    // ============================================================================
    // ORPHANED EVENT QUEUE PROCESSOR
    // Background task that retries events which arrived before enrollment
    // Runs every 10 seconds with exponential backoff (1s, 5s, 30s, 5m)
    // ============================================================================
    this.orphanedEventProcessor = setInterval(async () => {
      try {
        // Create event processor function that mimics webhook flow
        const eventProcessor = async (eventData) => {
          // Import CampaignEvent model for processing
          const { CampaignEvent, CampaignEnrollment, CampaignInstance, sequelize } = await import('./models/index.js');
          const { Op } = await import('sequelize');

          // Process event using same transaction logic as createEvent
          return await sequelize.transaction({
            isolationLevel: sequelize.constructor.Transaction.ISOLATION_LEVELS.READ_COMMITTED  // Optimal for atomic increments
          }, async (t) => {
            // Verify enrollment exists NOW (it may have been created since queue)
            const enrollment = await CampaignEnrollment.findByPk(eventData.enrollment_id, {
              transaction: t,
              attributes: ['id', 'instance_id', 'status']
            });

            if (!enrollment) {
              // Still not found - will retry with next backoff delay
              throw new Error(`Enrollment ${eventData.enrollment_id} still not found`);
            }

            // Lock instance row with SELECT FOR UPDATE for atomic counter updates
            const instance = await CampaignInstance.findByPk(enrollment.instance_id, {
              transaction: t,
              lock: t.LOCK.UPDATE  // Exclusive row lock prevents concurrent counter updates
            });

            if (!instance) {
              throw new Error(`Instance not found for enrollment ${eventData.enrollment_id}`);
            }

            // Use findOrCreate for idempotent event creation
            const [newEvent, created] = await CampaignEvent.findOrCreate({
              where: eventData.provider_event_id
                ? { provider_event_id: eventData.provider_event_id }
                : {
                  enrollment_id: eventData.enrollment_id,
                  event_type: eventData.event_type,
                  timestamp: eventData.timestamp
                },
              defaults: eventData,
              transaction: t
            });

            if (!created) {
              // Event already exists (duplicate) - success
              return newEvent;
            }

            // Update instance counters atomically - Instance locked, no race conditions
            switch (eventData.event_type) {
              case 'sent':
                await instance.increment('total_sent', { by: 1, transaction: t });
                break;
              case 'delivered':
                await instance.increment('total_delivered', { by: 1, transaction: t });
                break;
              case 'opened':
                await instance.increment('total_opened', { by: 1, transaction: t });
                break;
              case 'clicked':
                await instance.increment('total_clicked', { by: 1, transaction: t });
                break;
              case 'replied':
                await instance.increment('total_replied', { by: 1, transaction: t });
                break;
            }

            // Update enrollment status based on event
            if (eventData.event_type === 'bounced') {
              await enrollment.update({ status: 'bounced' }, { transaction: t });
            } else if (eventData.event_type === 'unsubscribed') {
              await enrollment.update({ status: 'unsubscribed' }, { transaction: t });
            } else if (eventData.event_type === 'replied') {
              await enrollment.update({ status: 'completed' }, { transaction: t });
            }

            return newEvent;
          });
        };

        // Process queue with the event processor
        await OrphanedEventQueue.processQueue(eventProcessor);

      } catch (error) {
        logger.error('Error processing orphaned event queue', {
          error: error.message,
          stack: error.stack
        });
      }
    }, 10000).unref(); // Process every 10 seconds (unref to allow clean exit)

    logger.info('✓ Orphaned event queue processor started (10s interval)');

    return new Promise((resolve) => {
      // Start HTTP server
      this.server.listen(this.port, () => {
        console.log('');
        console.log('🚀 Sales Automation API Server');
        console.log('================================');
        console.log(`📡 HTTP: http://localhost:${this.port}`);

        // Start HTTPS server if enabled
        if (this.enableHttps && this.httpsServer) {
          this.httpsServer.listen(this.httpsPort, () => {
            console.log(`🔒 HTTPS: https://localhost:${this.httpsPort}`);
            console.log(`📊 Dashboard: https://localhost:${this.httpsPort}/dashboard`);
            console.log(`🔌 WebSocket: wss://localhost:${this.httpsPort}`);
            console.log(`⚙️  YOLO Mode: ${this.yoloMode ? 'ENABLED' : 'DISABLED'}`);
            console.log('');
            console.log('Ready to automate sales! 🤖💼');
            console.log('');
            resolve();
          });
        } else {
          console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
          console.log(`🔌 WebSocket: ws://localhost:${this.port}`);
          console.log(`⚙️  YOLO Mode: ${this.yoloMode ? 'ENABLED' : 'DISABLED'}`);
          console.log('');
          console.log('Ready to automate sales! 🤖💼');
          console.log('');
          resolve();
        }
      });
    });
  }

  async stop() {
    // ============================================================================
    // GRACEFUL SHUTDOWN - Orphaned Event Processor
    // FIX #4: Drain queue before shutdown (process all ready events)
    // ============================================================================
    if (this.orphanedEventProcessor) {
      logger.info('Starting graceful shutdown of orphaned event queue processor...');
      clearInterval(this.orphanedEventProcessor);

      // Step 1: Wait for current batch to finish
      const maxWait = 30000;
      const start = Date.now();

      while (OrphanedEventQueue.processing && (Date.now() - start < maxWait)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (OrphanedEventQueue.processing) {
        logger.warn('Current batch still processing after 30s, forcing shutdown', {
          processing: OrphanedEventQueue.processing
        });
      }

      // Step 2: Drain remaining queue (FIX #4)
      try {
        const { CampaignEvent, CampaignEnrollment, CampaignInstance, sequelize } = await import('./models/index.js');

        // Event processor function (same as background processor)
        const eventProcessor = async (eventData) => {
          return await sequelize.transaction({
            isolationLevel: sequelize.constructor.Transaction.ISOLATION_LEVELS.READ_COMMITTED
          }, async (t) => {
            const enrollment = await CampaignEnrollment.findByPk(eventData.enrollment_id, {
              transaction: t,
              attributes: ['id', 'instance_id', 'status']
            });

            if (!enrollment) {
              throw new Error(`Enrollment ${eventData.enrollment_id} still not found`);
            }

            // Lock instance row with SELECT FOR UPDATE
            const instance = await CampaignInstance.findByPk(enrollment.instance_id, {
              transaction: t,
              lock: t.LOCK.UPDATE
            });

            // Process event based on type
            const eventTypeCounterMap = {
              'sent': 'total_sent',
              'delivered': 'total_delivered',
              'opened': 'total_opened',
              'clicked': 'total_clicked',
              'replied': 'total_replied',
              'bounced': 'total_bounced',
              'unsubscribed': 'total_unsubscribed',
              'errored': 'total_errored'
            };

            const counterField = eventTypeCounterMap[eventData.event_type?.toLowerCase()];
            if (counterField && instance[counterField] !== undefined) {
              await instance.increment(counterField, { by: 1, transaction: t });
            }

            // Create event record
            const event = await CampaignEvent.create({
              ...eventData,
              user_id: eventData.user_id,
              enrollment_id: eventData.enrollment_id,
              instance_id: instance.id
            }, { transaction: t });

            return event;
          });
        };

        // Drain the queue (max 30 seconds)
        const drainResult = await OrphanedEventQueue.drainQueue(eventProcessor, 30000);

        if (drainResult.success) {
          logger.info('Queue fully drained before shutdown', {
            totalProcessed: drainResult.totalProcessed,
            elapsedTime: `${drainResult.elapsedTime}ms`
          });
        } else {
          logger.warn('Queue not fully drained before shutdown timeout', {
            totalProcessed: drainResult.totalProcessed,
            remaining: drainResult.remaining,
            elapsedTime: `${drainResult.elapsedTime}ms`
          });
        }

      } catch (error) {
        logger.error('Error during queue drain', { error: error.message });
      }

      // Step 3: Disconnect Redis
      try {
        await OrphanedEventQueue.disconnect();
        logger.info('Redis connection closed gracefully');
      } catch (error) {
        logger.error('Error closing Redis connection', { error: error.message });
      }
    }

    // Stop cron jobs
    this.cronJobs.forEach(job => job.stop());

    // Close WebSocket
    this.wss.close();

    // Close HTTPS server if running
    if (this.httpsServer) {
      await new Promise((resolve) => {
        this.httpsServer.close(() => {
          console.log('HTTPS server stopped');
          resolve();
        });
      });
    }

    // Close HTTP server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('HTTP server stopped');
        resolve();
      });
    });
  }
}

// CLI - Check if this file is being run directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const args = process.argv.slice(2);

  const options = {
    port: parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1]) || 3000,
    yolo: args.includes('--yolo'),
  };

  const server = new SalesAutomationAPIServer(options);

  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

export { SalesAutomationAPIServer };
