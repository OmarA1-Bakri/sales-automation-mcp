'use strict';

/**
 * Migration: Add Video Generations Table
 *
 * Tracks HeyGen video generation status for:
 * - Webhook completion handling
 * - Orphan video cleanup
 * - Cost tracking per campaign
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('video_generations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      heygen_video_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'HeyGen video ID returned from generation API'
      },
      campaign_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Associated campaign ID'
      },
      enrollment_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Associated enrollment ID'
      },
      lead_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Email of lead receiving the video'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current video generation status'
      },
      video_url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'URL of completed video'
      },
      thumbnail_url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'URL of video thumbnail'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if generation failed'
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of status check attempts for orphan cleanup'
      },
      cost_credits: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'HeyGen credits consumed for this video'
      },
      script_content: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Script used for video generation'
      },
      duration_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Video duration in seconds'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When video generation completed'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Index for finding pending videos (for orphan cleanup)
    await queryInterface.addIndex('video_generations', {
      fields: ['status'],
      where: { status: 'pending' },
      name: 'idx_video_generations_pending'
    });

    // Index for campaign lookups
    await queryInterface.addIndex('video_generations', {
      fields: ['campaign_id'],
      name: 'idx_video_generations_campaign'
    });

    // Index for enrollment lookups
    await queryInterface.addIndex('video_generations', {
      fields: ['enrollment_id'],
      name: 'idx_video_generations_enrollment'
    });

    console.log('✓ Created video_generations table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('video_generations');
    console.log('✓ Dropped video_generations table');
  }
};
