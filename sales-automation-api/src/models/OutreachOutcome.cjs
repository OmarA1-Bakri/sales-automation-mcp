/**
 * OutreachOutcome Model
 * Tracks outcomes of outreach for AI learning and template performance ranking
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const OutreachOutcome = sequelize.define('outreach_outcomes', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Link to campaign event/enrollment
    enrollment_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'campaign_enrollments',
        key: 'id'
      },
      onDelete: 'SET NULL',
      field: 'enrollment_id'
    },
    // What template/approach was used
    template_used: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'template_used'
    },
    subject_line: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'subject_line'
    },
    // Context
    persona: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    company_size: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'company_size'
    },
    region: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    // Channel
    channel: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'email',
      validate: {
        isIn: [['email', 'linkedin', 'sms', 'phone']]
      }
    },
    // Outcomes
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'sent_at'
    },
    opened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    open_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'open_count'
    },
    first_opened_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'first_opened_at'
    },
    clicked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    click_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'click_count'
    },
    replied: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    replied_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'replied_at'
    },
    reply_sentiment: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['positive', 'neutral', 'negative', 'objection', null]]
      },
      field: 'reply_sentiment'
    },
    meeting_booked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'meeting_booked'
    },
    meeting_booked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'meeting_booked_at'
    },
    unsubscribed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    bounced: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Learning elements
    effective_elements: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'effective_elements',
      comment: 'Extracted elements that contributed to success'
    },
    personalization_used: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'personalization_used',
      comment: 'Array of personalization tactics used'
    },
    // Quality metrics
    quality_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'quality_score',
      comment: 'Pre-send quality score'
    },
    // Timestamps
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'outreach_outcomes',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true,
    indexes: [
      { fields: ['enrollment_id'] },
      { fields: ['template_used'] },
      { fields: ['persona'] },
      { fields: ['sent_at'] },
      { fields: ['opened'] },
      { fields: ['replied'] },
      { fields: ['meeting_booked'] },
      { fields: ['channel'] },
      { fields: ['template_used', 'persona'] },
      { fields: ['sent_at', 'opened'] },
      { fields: ['sent_at', 'replied'] }
    ]
  });

  // Class methods for analytics

  /**
   * Get template performance metrics
   */
  OutreachOutcome.getTemplatePerformance = async function(options = {}) {
    const { days = 30, minSamples = 10 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // SECURITY FIX: Validate minSamples to prevent SQL injection
    const validatedMinSamples = parseInt(minSamples, 10);
    if (isNaN(validatedMinSamples) || validatedMinSamples < 0) {
      throw new Error('minSamples must be a non-negative integer');
    }

    const results = await this.findAll({
      attributes: [
        'template_used',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sent'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN opened THEN 1 ELSE 0 END')), 'total_opened'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN replied THEN 1 ELSE 0 END')), 'total_replied'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN meeting_booked THEN 1 ELSE 0 END')), 'total_meetings']
      ],
      where: {
        sent_at: { [Op.gte]: since },
        template_used: { [Op.ne]: null }
      },
      group: ['template_used'],
      having: sequelize.literal(`COUNT(id) >= ${validatedMinSamples}`),
      order: [[sequelize.literal('total_meetings'), 'DESC']],
      raw: true
    });

    return results.map(r => ({
      template: r.template_used,
      sent: parseInt(r.total_sent),
      open_rate: r.total_sent > 0 ? (parseInt(r.total_opened) / parseInt(r.total_sent) * 100).toFixed(1) : 0,
      reply_rate: r.total_sent > 0 ? (parseInt(r.total_replied) / parseInt(r.total_sent) * 100).toFixed(1) : 0,
      meeting_rate: r.total_sent > 0 ? (parseInt(r.total_meetings) / parseInt(r.total_sent) * 100).toFixed(1) : 0
    }));
  };

  /**
   * Get best template by persona
   */
  OutreachOutcome.getBestTemplateByPersona = async function(persona, options = {}) {
    const { days = 30, minSamples = 5 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // SECURITY FIX: Validate minSamples to prevent SQL injection
    const validatedMinSamples = parseInt(minSamples, 10);
    if (isNaN(validatedMinSamples) || validatedMinSamples < 0) {
      throw new Error('minSamples must be a non-negative integer');
    }

    const results = await this.findAll({
      attributes: [
        'template_used',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sent'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN replied THEN 1 ELSE 0 END')), 'total_replied'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN meeting_booked THEN 1 ELSE 0 END')), 'total_meetings']
      ],
      where: {
        sent_at: { [Op.gte]: since },
        persona: { [Op.iLike]: `%${persona}%` },
        template_used: { [Op.ne]: null }
      },
      group: ['template_used'],
      having: sequelize.literal(`COUNT(id) >= ${validatedMinSamples}`),
      order: [[sequelize.literal('total_meetings'), 'DESC']],
      limit: 1,
      raw: true
    });

    return results[0] || null;
  };

  /**
   * Get subject line performance
   */
  OutreachOutcome.getSubjectLinePerformance = async function(options = {}) {
    const { days = 30, minSamples = 10 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // SECURITY FIX: Validate minSamples to prevent SQL injection
    const validatedMinSamples = parseInt(minSamples, 10);
    if (isNaN(validatedMinSamples) || validatedMinSamples < 0) {
      throw new Error('minSamples must be a non-negative integer');
    }

    const results = await this.findAll({
      attributes: [
        'subject_line',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sent'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN opened THEN 1 ELSE 0 END')), 'total_opened']
      ],
      where: {
        sent_at: { [Op.gte]: since },
        subject_line: { [Op.ne]: null },
        channel: 'email'
      },
      group: ['subject_line'],
      having: sequelize.literal(`COUNT(id) >= ${validatedMinSamples}`),
      order: [[sequelize.literal('total_opened::float / COUNT(id)'), 'DESC']],
      limit: 20,
      raw: true
    });

    return results.map(r => ({
      subject_line: r.subject_line,
      sent: parseInt(r.total_sent),
      open_rate: r.total_sent > 0 ? (parseInt(r.total_opened) / parseInt(r.total_sent) * 100).toFixed(1) : 0
    }));
  };

  /**
   * Get outcomes summary for time period
   */
  OutreachOutcome.getSummary = async function(options = {}) {
    const { days = 7 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const summary = await this.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_sent'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN opened THEN 1 ELSE 0 END')), 'total_opened'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN clicked THEN 1 ELSE 0 END')), 'total_clicked'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN replied THEN 1 ELSE 0 END')), 'total_replied'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN meeting_booked THEN 1 ELSE 0 END')), 'total_meetings'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN bounced THEN 1 ELSE 0 END')), 'total_bounced'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN unsubscribed THEN 1 ELSE 0 END')), 'total_unsubscribed']
      ],
      where: {
        sent_at: { [Op.gte]: since }
      },
      raw: true
    });

    const total = parseInt(summary.total_sent) || 0;

    return {
      period_days: days,
      total_sent: total,
      total_opened: parseInt(summary.total_opened) || 0,
      total_clicked: parseInt(summary.total_clicked) || 0,
      total_replied: parseInt(summary.total_replied) || 0,
      total_meetings: parseInt(summary.total_meetings) || 0,
      total_bounced: parseInt(summary.total_bounced) || 0,
      total_unsubscribed: parseInt(summary.total_unsubscribed) || 0,
      open_rate: total > 0 ? ((parseInt(summary.total_opened) / total) * 100).toFixed(1) : '0.0',
      reply_rate: total > 0 ? ((parseInt(summary.total_replied) / total) * 100).toFixed(1) : '0.0',
      meeting_rate: total > 0 ? ((parseInt(summary.total_meetings) / total) * 100).toFixed(1) : '0.0',
      bounce_rate: total > 0 ? ((parseInt(summary.total_bounced) / total) * 100).toFixed(1) : '0.0'
    };
  };

  // PERFORMANCE: Cache invalidation hooks
  // Invalidate analytics caches when outcomes change
  const invalidateAnalyticsCaches = async () => {
    try {
      // Dynamic import since AnalyticsCacheService is an ES module
      const { AnalyticsCacheService } = await import('../services/AnalyticsCacheService.js');
      AnalyticsCacheService.invalidateNamespace('summary');
      AnalyticsCacheService.invalidateNamespace('templates');
      AnalyticsCacheService.invalidateNamespace('personas');
      AnalyticsCacheService.invalidateNamespace('subjects');
    } catch (e) {
      // Cache service may not be available during migrations
      console.debug('Cache invalidation skipped:', e.message);
    }
  };

  OutreachOutcome.addHook('afterCreate', 'invalidateCache', invalidateAnalyticsCaches);
  OutreachOutcome.addHook('afterUpdate', 'invalidateCache', invalidateAnalyticsCaches);
  OutreachOutcome.addHook('afterBulkCreate', 'invalidateCacheBulk', invalidateAnalyticsCaches);
  OutreachOutcome.addHook('afterBulkUpdate', 'invalidateCacheBulk', invalidateAnalyticsCaches);

  return OutreachOutcome;
};
