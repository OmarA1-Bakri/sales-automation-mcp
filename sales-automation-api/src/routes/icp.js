/**
 * ICP Profile Routes
 * RESTful API endpoints for Ideal Customer Profile management
 */

import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('ICP');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const FirmographicsSchema = z.object({
  companySize: z.object({
    min: z.number().min(0).default(0),
    max: z.number().min(0).default(0)
  }).default({ min: 0, max: 0 }),
  revenue: z.object({
    min: z.number().min(0).default(0),
    max: z.number().min(0).default(0)
  }).default({ min: 0, max: 0 }),
  industries: z.array(z.string()).default([]),
  geographies: z.array(z.string()).default([])
}).default({});

const TitlesSchema = z.object({
  primary: z.array(z.string()).default([]),
  secondary: z.array(z.string()).default([])
}).default({});

const ScoringSchema = z.object({
  autoApprove: z.number().min(0).max(1).default(0.85),
  reviewRequired: z.number().min(0).max(1).default(0.70),
  disqualify: z.number().min(0).max(1).default(0.50)
}).default({});

const StatsSchema = z.object({
  discovered: z.number().default(0),
  enriched: z.number().default(0),
  enrolled: z.number().default(0),
  avgScore: z.number().default(0)
}).default({});

const CreateICPSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional().default(''),
    tier: z.enum(['core', 'expansion', 'strategic']).default('core'),
    active: z.boolean().default(true),
    firmographics: FirmographicsSchema,
    titles: TitlesSchema,
    scoring: ScoringSchema,
    stats: StatsSchema
  })
});

const UpdateICPSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    tier: z.enum(['core', 'expansion', 'strategic']).optional(),
    active: z.boolean().optional(),
    firmographics: FirmographicsSchema.optional(),
    titles: TitlesSchema.optional(),
    scoring: ScoringSchema.optional(),
    stats: StatsSchema.optional()
  })
});

const ICPParamSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Apply authentication to all ICP routes
router.use(authenticate);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/icp
 * List all ICP profiles
 */
router.get('/', async (req, res) => {
  try {
    const { ICPProfile } = await import('../models/index.js');

    const profiles = await ICPProfile.findAll({
      order: [['created_at', 'DESC']]
    });

    logger.info('Listed ICP profiles', { count: profiles.length });

    res.json({
      success: true,
      profiles: profiles
    });
  } catch (error) {
    logger.error('Failed to list ICP profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load ICP profiles',
      message: error.message
    });
  }
});

/**
 * GET /api/icp/:id
 * Get single ICP profile by ID
 */
router.get('/:id', validate(ICPParamSchema), async (req, res) => {
  try {
    const { ICPProfile } = await import('../models/index.js');
    const { id } = req.params;

    const profile = await ICPProfile.findByPk(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'ICP profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error('Failed to get ICP profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load ICP profile',
      message: error.message
    });
  }
});

/**
 * POST /api/icp
 * Create new ICP profile
 */
router.post('/', validate(CreateICPSchema), async (req, res) => {
  try {
    const { ICPProfile } = await import('../models/index.js');

    const profileData = req.validatedBody || req.body;

    // Check for duplicate name
    const existing = await ICPProfile.findOne({
      where: { name: profileData.name }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A profile with this name already exists'
      });
    }

    const profile = await ICPProfile.create(profileData);

    logger.info('Created ICP profile', {
      id: profile.id,
      name: profile.name,
      tier: profile.tier
    });

    res.status(201).json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error('Failed to create ICP profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ICP profile',
      message: error.message
    });
  }
});

/**
 * PATCH /api/icp/:id
 * Update existing ICP profile
 */
router.patch('/:id', validate(UpdateICPSchema), async (req, res) => {
  try {
    const { ICPProfile } = await import('../models/index.js');
    const { id } = req.params;
    const updates = req.validatedBody || req.body;

    const profile = await ICPProfile.findByPk(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'ICP profile not found'
      });
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== profile.name) {
      const existing = await ICPProfile.findOne({
        where: { name: updates.name }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A profile with this name already exists'
        });
      }
    }

    // Merge nested objects properly
    if (updates.firmographics) {
      updates.firmographics = { ...profile.firmographics, ...updates.firmographics };
    }
    if (updates.titles) {
      updates.titles = { ...profile.titles, ...updates.titles };
    }
    if (updates.scoring) {
      updates.scoring = { ...profile.scoring, ...updates.scoring };
    }
    if (updates.stats) {
      updates.stats = { ...profile.stats, ...updates.stats };
    }

    await profile.update(updates);

    logger.info('Updated ICP profile', {
      id: profile.id,
      name: profile.name,
      fields: Object.keys(updates)
    });

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error('Failed to update ICP profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ICP profile',
      message: error.message
    });
  }
});

/**
 * DELETE /api/icp/:id
 * Delete ICP profile (soft delete - sets active=false)
 */
router.delete('/:id', validate(ICPParamSchema), async (req, res) => {
  try {
    const { ICPProfile, CampaignTemplate } = await import('../models/index.js');
    const { id } = req.params;

    const profile = await ICPProfile.findByPk(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'ICP profile not found'
      });
    }

    // Check if profile is linked to any campaign templates
    const linkedTemplates = await CampaignTemplate.count({
      where: { icp_profile_id: id }
    });

    if (linkedTemplates > 0) {
      // Soft delete if linked to templates
      await profile.update({ active: false });

      logger.info('Soft deleted ICP profile (has linked templates)', {
        id: profile.id,
        linkedTemplates
      });

      return res.json({
        success: true,
        message: 'Profile deactivated (has linked campaign templates)',
        softDeleted: true
      });
    }

    // Hard delete if no links
    await profile.destroy();

    logger.info('Deleted ICP profile', { id: profile.id, name: profile.name });

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete ICP profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ICP profile',
      message: error.message
    });
  }
});

export default router;
