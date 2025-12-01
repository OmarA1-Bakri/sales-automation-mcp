/**
 * HeyGen Video API Routes
 * RESTful API endpoints for HeyGen video generation and management
 *
 * Used by desktop UI to:
 * - List available avatars and voices for selection
 * - Check quota status before video generation
 * - Monitor video generation progress
 * - Test video generation with preview
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
const router = express.Router();

import { HeyGenVideoProvider } from '../providers/heygen/HeyGenVideoProvider.js';
import { asyncHandler } from '../middleware/campaign-error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('HeyGen-Routes');

// Singleton provider instance
let heygenProvider = null;

/**
 * Get or create HeyGen provider instance
 */
function getProvider() {
  if (!heygenProvider) {
    heygenProvider = new HeyGenVideoProvider();
  }
  return heygenProvider;
}

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * General HeyGen operations rate limit
 * 60 requests per 15 minutes
 */
const heygenRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Maximum 60 requests per 15 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Video generation rate limit (more restrictive - expensive operation)
 * 10 requests per 15 minutes
 */
const videoGenerationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many video generation requests',
    message: 'Rate limit exceeded. Maximum 10 video generations per 15 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// Apply authentication to ALL HeyGen routes
router.use(authenticate);

// Apply general rate limiting to ALL HeyGen routes
router.use(heygenRateLimit);

// ============================================================================
// AVATAR ROUTES
// ============================================================================

/**
 * GET /api/heygen/avatars
 * List all available HeyGen avatars for video generation
 *
 * Response:
 * - avatars: array of avatar objects
 *   - id: string
 *   - name: string
 *   - gender: string
 *   - previewUrl: string
 *   - supportedLanguages: string[]
 */
router.get(
  '/avatars',
  asyncHandler(async (req, res) => {
    const provider = getProvider();

    try {
      const avatars = await provider.listAvatars();

      logger.info('Avatars listed successfully', { count: avatars.length });

      res.json({
        success: true,
        data: {
          avatars,
          count: avatars.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to list avatars', { error: error.message });

      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Unable to fetch avatars from HeyGen. Please check API configuration.',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ============================================================================
// VOICE ROUTES
// ============================================================================

/**
 * GET /api/heygen/voices
 * List all available HeyGen voices for video generation
 *
 * Query params:
 * - language: string (optional) - Filter by language code (e.g., 'en', 'es')
 * - gender: string (optional) - Filter by gender ('male', 'female')
 *
 * Response:
 * - voices: array of voice objects
 *   - id: string
 *   - name: string
 *   - language: string
 *   - gender: string
 *   - accent: string
 *   - sampleUrl: string
 */
router.get(
  '/voices',
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    const { language, gender } = req.query;

    try {
      let voices = await provider.listVoices();

      // Apply optional filters
      if (language) {
        voices = voices.filter(v =>
          v.language?.toLowerCase().startsWith(language.toLowerCase())
        );
      }

      if (gender) {
        voices = voices.filter(v =>
          v.gender?.toLowerCase() === gender.toLowerCase()
        );
      }

      logger.info('Voices listed successfully', {
        count: voices.length,
        filters: { language, gender }
      });

      res.json({
        success: true,
        data: {
          voices,
          count: voices.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to list voices', { error: error.message });

      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Unable to fetch voices from HeyGen. Please check API configuration.',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ============================================================================
// QUOTA ROUTES
// ============================================================================

/**
 * GET /api/heygen/quota
 * Get current HeyGen quota status
 *
 * Response:
 * - remaining: number (remaining credits, -1 if unknown)
 * - total: number (total quota, -1 if unknown)
 * - used: number (used credits, -1 if unknown)
 * - resetsAt: string|null (ISO date of quota reset)
 */
router.get(
  '/quota',
  asyncHandler(async (req, res) => {
    const provider = getProvider();

    try {
      const quota = await provider.getQuotaStatus();

      logger.debug('Quota status retrieved', {
        remaining: quota.remaining,
        total: quota.total
      });

      res.json({
        success: true,
        data: quota,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get quota status', { error: error.message });

      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Unable to fetch quota from HeyGen.',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ============================================================================
// VIDEO STATUS ROUTES
// ============================================================================

/**
 * GET /api/heygen/videos/:videoId/status
 * Get video generation status and URLs (when completed)
 *
 * NOTE: HeyGen video URLs are temporary and expire.
 * Call this endpoint to get fresh URLs.
 *
 * Params:
 * - videoId: string - HeyGen video ID
 *
 * Response:
 * - videoId: string
 * - status: 'pending' | 'processing' | 'completed' | 'failed'
 * - progress: number (0-100)
 * - videoUrl: string (only when completed)
 * - thumbnailUrl: string (only when completed)
 * - duration: number (only when completed, in seconds)
 * - error: string (only when failed)
 */
router.get(
  '/videos/:videoId/status',
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'videoId parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const status = await provider.getVideoStatus(videoId);

      logger.debug('Video status retrieved', {
        videoId,
        status: status.status,
        progress: status.progress
      });

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get video status', {
        videoId,
        error: error.message
      });

      // Check if it's a "not found" error
      if (error.message.includes('not found') || error.message.includes('404')) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Video ${videoId} not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Unable to fetch video status from HeyGen.',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ============================================================================
// VIDEO GENERATION ROUTES (Test/Preview)
// ============================================================================

/**
 * POST /api/heygen/videos/preview
 * Generate a preview video for testing (uses test mode to save quota)
 *
 * This endpoint is for testing avatar/voice combinations before
 * actual campaign execution.
 *
 * Body:
 * - avatarId: string (required)
 * - voiceId: string (required)
 * - script: string (required, max 500 chars for preview)
 *
 * Response:
 * - videoId: string
 * - status: 'pending'
 */
router.post(
  '/videos/preview',
  videoGenerationRateLimit,
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    const { avatarId, voiceId, script } = req.body;

    // Validate required fields
    if (!avatarId || !voiceId || !script) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'avatarId, voiceId, and script are required',
        timestamp: new Date().toISOString()
      });
    }

    // Limit script length for preview
    if (script.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Preview script must be 500 characters or less',
        timestamp: new Date().toISOString()
      });
    }

    try {
      logger.info('Generating preview video', {
        avatarId,
        voiceId,
        scriptLength: script.length
      });

      const result = await provider.generateVideo({
        avatarId,
        voiceId,
        script,
        variables: {},
        options: {
          dimensions: { width: 640, height: 360 } // Lower res for preview
        },
        metadata: { type: 'preview' }
      });

      res.status(202).json({
        success: true,
        message: 'Video generation started',
        data: {
          videoId: result.videoId,
          status: result.status
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to generate preview video', {
        error: error.message,
        avatarId,
        voiceId
      });

      // Check for quota exceeded
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return res.status(402).json({
          success: false,
          error: 'Payment Required',
          message: 'HeyGen quota exceeded. Please upgrade your plan or wait for quota reset.',
          timestamp: new Date().toISOString()
        });
      }

      res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Unable to generate video. Please check HeyGen configuration.',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ============================================================================
// CAPABILITIES ROUTE
// ============================================================================

/**
 * GET /api/heygen/capabilities
 * Get HeyGen provider capabilities
 *
 * Response:
 * - supportsCustomAvatars: boolean
 * - supportsCaptions: boolean
 * - supportsBackgrounds: boolean
 * - maxVideoDuration: number (seconds)
 * - maxVideoWidth: number
 * - maxVideoHeight: number
 * - supportedFormats: string[]
 */
router.get(
  '/capabilities',
  asyncHandler(async (req, res) => {
    const provider = getProvider();

    const capabilities = provider.getCapabilities();

    res.json({
      success: true,
      data: capabilities,
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// CONFIG VALIDATION ROUTE
// ============================================================================

/**
 * GET /api/heygen/validate
 * Validate HeyGen API configuration
 *
 * Response:
 * - valid: boolean
 * - message: string
 */
router.get(
  '/validate',
  asyncHandler(async (req, res) => {
    const provider = getProvider();

    try {
      await provider.validateConfig();

      logger.info('HeyGen configuration validated');

      res.json({
        success: true,
        data: {
          valid: true,
          message: 'HeyGen API configuration is valid'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.warn('HeyGen configuration validation failed', {
        error: error.message
      });

      res.json({
        success: true,  // Request succeeded, just validation failed
        data: {
          valid: false,
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  })
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
