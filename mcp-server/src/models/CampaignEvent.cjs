/**
 * CampaignEvent Model
 * Stores all campaign-related events for analytics and tracking
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const CampaignEvent = sequelize.define('campaign_events', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    enrollment_id: {
      type: DataTypes.UUID,
      allowNull: true,  // Allow NULL for orphaned events (webhook arrives before enrollment stored)
      references: {
        model: 'campaign_enrollments',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      field: 'enrollment_id'
    },
    instance_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'campaign_instances',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      field: 'instance_id'
    },
    event_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed', 'spam_reported',
                'profile_visited', 'connection_sent', 'connection_accepted', 'connection_rejected',
                'message_sent', 'message_read', 'message_replied', 'voice_message_sent',
                'video_generated', 'video_generation_failed', 'video_viewed', 'video_completed', 'video_shared']]
      },
      field: 'event_type'
    },
    channel: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['email', 'linkedin', 'video', 'sms', 'phone']]
      }
    },
    step_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'step_number'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    provider_event_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      // unique: true, // Removed - handled by partial index below for non-null values
      field: 'provider_event_id'
    },
    provider_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_message_id'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    video_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'video_id'
    },
    video_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'video_url'
    },
    video_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'video_status'
    },
    video_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'video_duration'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'campaign_events',
    timestamps: false, // We use created_at but not updated_at
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['enrollment_id'] },
      { fields: ['event_type'] },
      { fields: ['timestamp'] },
      { fields: ['channel'] },
      { fields: ['channel', 'event_type'] },
      { fields: ['enrollment_id', 'event_type'] },
      {
        fields: ['provider_event_id'],
        unique: true,
        where: {
          provider_event_id: { [Op.ne]: null }
        }
      }
    ]
  });

  // Class methods
  CampaignEvent.createIfNotExists = async function(eventData) {
    // Check if provider_event_id already exists (webhook deduplication)
    if (eventData.provider_event_id) {
      const existing = await this.findOne({
        where: { provider_event_id: eventData.provider_event_id }
      });
      if (existing) {
        console.log(`[CampaignEvent] Duplicate event detected: ${eventData.provider_event_id}`);
        return { created: false, event: existing };
      }
    }

    const event = await this.create(eventData);
    return { created: true, event };
  };

  CampaignEvent.getEventsByEnrollment = function(enrollmentId, options = {}) {
    return this.findAll({
      where: { enrollment_id: enrollmentId },
      order: [['timestamp', 'DESC']],
      ...options
    });
  };

  CampaignEvent.getMetricsByChannel = async function(enrollmentIds) {
    const events = await this.findAll({
      where: {
        enrollment_id: { [sequelize.Sequelize.Op.in]: enrollmentIds }
      },
      attributes: [
        'channel',
        'event_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['channel', 'event_type']
    });

    return events;
  };

  return CampaignEvent;
};
