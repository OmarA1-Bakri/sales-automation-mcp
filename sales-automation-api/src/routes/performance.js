/**
 * Performance Routes
 * RESTful API endpoints for performance metrics and analytics
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
const router = express.Router();

import { OutcomeTracker } from '../services/OutcomeTracker.js';
import { TemplateRanker } from '../services/TemplateRanker.js';
import { createLogger } from '../utils/logger.js';
import { authenticate } from '../middleware/authenticate.js';

const logger = createLogger('PerformanceRoutes');

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Analytics endpoint rate limit
 * 30 requests per 5 minutes (slightly more generous than campaign analytics)
 */
const performanceRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded for performance analytics. Maximum 30 requests per 5 minutes.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/performance/summary
 * Get overall performance summary
 * Query params: days (default: 7)
 */
router.get('/summary', authenticate, performanceRateLimit, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid days parameter',
        message: 'Days must be between 1 and 365'
      });
    }

    const summary = await OutcomeTracker.getSummary({ days });

    res.json({
      success: true,
      data: {
        period_days: days,
        metrics: summary
      }
    });

    logger.info('Performance summary retrieved', { days });
  } catch (error) {
    logger.error('Failed to get performance summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve performance summary'
    });
  }
});

/**
 * GET /api/performance/templates
 * Get template performance rankings
 * Query params: days (default: 30), minSamples (default: 10)
 */
router.get('/templates', authenticate, performanceRateLimit, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const minSamples = parseInt(req.query.minSamples) || 10;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid days parameter',
        message: 'Days must be between 1 and 365'
      });
    }

    if (minSamples < 1 || minSamples > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minSamples parameter',
        message: 'minSamples must be between 1 and 1000'
      });
    }

    const rankings = await TemplateRanker.getRankedTemplates({ days, minSamples });

    res.json({
      success: true,
      data: {
        period_days: days,
        min_samples: minSamples,
        templates: rankings
      }
    });

    logger.info('Template rankings retrieved', { days, minSamples, count: rankings.length });
  } catch (error) {
    logger.error('Failed to get template rankings', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve template rankings'
    });
  }
});

/**
 * GET /api/performance/agents
 * Get AI agent performance metrics
 * TODO: Implement once agent tracking is in place
 */
router.get('/agents', authenticate, performanceRateLimit, async (req, res) => {
  try {
    // Placeholder response
    res.json({
      success: true,
      data: {
        message: 'Agent performance tracking not yet implemented',
        agents: []
      }
    });

    logger.info('Agent performance endpoint called (not yet implemented)');
  } catch (error) {
    logger.error('Failed to get agent performance', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve agent performance'
    });
  }
});

/**
 * GET /api/performance/quality
 * Get data quality metrics
 * TODO: Implement once quality scoring is tracked
 */
router.get('/quality', authenticate, performanceRateLimit, async (req, res) => {
  try {
    // Placeholder response
    res.json({
      success: true,
      data: {
        message: 'Quality metrics tracking not yet implemented',
        metrics: {}
      }
    });

    logger.info('Quality metrics endpoint called (not yet implemented)');
  } catch (error) {
    logger.error('Failed to get quality metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve quality metrics'
    });
  }
});

export default router;
