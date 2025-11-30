/**
 * VideoGeneration Model
 *
 * Tracks HeyGen video generation status for:
 * - Webhook completion handling
 * - Orphan video cleanup
 * - Cost tracking per campaign
 *
 * @see src/providers/heygen/HeyGenVideoProvider.js
 * @see src/db/migrations/20251130000002-add-video-generations.cjs
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VideoGeneration = sequelize.define('VideoGeneration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    heygen_video_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'HeyGen video ID returned from generation API'
    },

    campaign_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Associated campaign ID'
    },

    enrollment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Associated enrollment ID'
    },

    lead_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email of lead receiving the video'
    },

    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current video generation status'
    },

    video_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL of completed video'
    },

    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL of video thumbnail'
    },

    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if generation failed'
    },

    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of status check attempts for orphan cleanup'
    },

    cost_credits: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'HeyGen credits consumed for this video'
    },

    script_content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Script used for video generation'
    },

    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Video duration in seconds'
    },

    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When video generation completed'
    }

  }, {
    tableName: 'video_generations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['status'],
        where: { status: 'pending' },
        name: 'idx_video_generations_pending'
      },
      {
        fields: ['campaign_id'],
        name: 'idx_video_generations_campaign'
      },
      {
        fields: ['enrollment_id'],
        name: 'idx_video_generations_enrollment'
      }
    ],
    comment: 'Tracks HeyGen video generation status and metadata'
  });

  // Class methods for common queries
  VideoGeneration.findPendingForCleanup = async function(maxAttempts = 10, olderThanHours = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    return this.findAll({
      where: {
        status: 'pending',
        attempts: { [sequelize.Sequelize.Op.lt]: maxAttempts },
        created_at: { [sequelize.Sequelize.Op.lt]: cutoffTime }
      },
      order: [['created_at', 'ASC']],
      limit: 100
    });
  };

  VideoGeneration.markCompleted = async function(heygenVideoId, videoUrl, thumbnailUrl, duration) {
    return this.update(
      {
        status: 'completed',
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration_seconds: duration,
        completed_at: new Date()
      },
      { where: { heygen_video_id: heygenVideoId } }
    );
  };

  VideoGeneration.markFailed = async function(heygenVideoId, errorMessage) {
    return this.update(
      {
        status: 'failed',
        error_message: errorMessage
      },
      { where: { heygen_video_id: heygenVideoId } }
    );
  };

  return VideoGeneration;
};
