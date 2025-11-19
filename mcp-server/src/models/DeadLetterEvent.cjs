/**
 * DeadLetterEvent Model (FIX #6: Dead Letter Queue for Failed Events)
 *
 * Stores webhook events that failed after max retry attempts.
 * Allows for manual review, replay, and analysis of failure patterns.
 *
 * @see src/services/OrphanedEventQueue.js - moves events here after max retries
 * @see src/controllers/admin-controller.js - replay endpoint
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeadLetterEvent = sequelize.define('DeadLetterEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Original event data (full webhook payload)
    event_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Original webhook event payload'
    },

    // Failure metadata
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Error message from final failure'
    },

    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Number of retry attempts made'
    },

    first_attempted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When event was first queued'
    },

    last_attempted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When final retry attempt was made'
    },

    // Status tracking
    status: {
      type: DataTypes.ENUM('failed', 'replaying', 'replayed', 'ignored'),
      defaultValue: 'failed',
      allowNull: false,
      comment: 'Current status of dead letter event'
    },

    replayed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When event was successfully replayed'
    },

    // Event classification
    event_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Event type from payload (sent, opened, clicked, etc.)'
    },

    channel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Channel from payload (email, linkedin, etc.)'
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Contact email from payload (for filtering)'
    },

    // User who owns this event
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User ID from payload'
    }

  }, {
    tableName: 'dead_letter_events',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['event_type']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      },
      {
        name: 'idx_dead_letter_events_email',
        fields: ['email']
      }
    ],
    comment: 'Dead Letter Queue for webhook events that failed after max retries'
  });

  return DeadLetterEvent;
};
