/**
 * Migration: Create dead_letter_events table
 *
 * FIX #6: Dead Letter Queue for Failed Webhook Events
 *
 * This migration creates the dead_letter_events table for storing webhook events
 * that failed after maximum retry attempts. Allows manual review, replay, and
 * failure pattern analysis.
 *
 * Run with: npx sequelize-cli db:migrate
 * Rollback with: npx sequelize-cli db:migrate:undo
 *
 * @see src/models/DeadLetterEvent.cjs - Model definition
 * @see src/api-server.js - Admin endpoints for DLQ management
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dead_letter_events', {
      // Primary key
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for dead letter event'
      },

      // Original event data
      event_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Complete original webhook event payload'
      },

      // Failure metadata
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Error message from final failed attempt'
      },

      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Number of retry attempts made before failure'
      },

      first_attempted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp when event was first queued for processing'
      },

      last_attempted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp of final retry attempt'
      },

      // Status tracking
      status: {
        type: Sequelize.ENUM('failed', 'replaying', 'replayed', 'ignored'),
        defaultValue: 'failed',
        allowNull: false,
        comment: 'Current status: failed (new), replaying (being retried), replayed (success), ignored (manual skip)'
      },

      replayed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when event was successfully replayed (null if not replayed)'
      },

      // Event classification (for filtering and analysis)
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Event type from payload (sent, opened, clicked, replied, bounced, etc.)'
      },

      channel: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Communication channel from payload (email, linkedin, phone, etc.)'
      },

      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Contact email from payload (for filtering and searching)'
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'User ID who owns this event (for tenant isolation)'
      },

      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Record creation timestamp'
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Record last update timestamp'
      }
    }, {
      comment: 'Dead Letter Queue for webhook events that failed after maximum retry attempts'
    });

    // Create indexes for common query patterns
    console.log('[Migration] Creating indexes on dead_letter_events...');

    // Index for filtering by status (most common query)
    await queryInterface.addIndex('dead_letter_events', ['status'], {
      name: 'idx_dead_letter_events_status',
      comment: 'Filter events by status (failed, replaying, replayed, ignored)'
    });

    // Index for filtering by event type
    await queryInterface.addIndex('dead_letter_events', ['event_type'], {
      name: 'idx_dead_letter_events_event_type',
      comment: 'Filter events by type (sent, opened, clicked, etc.)'
    });

    // Index for filtering by user (tenant isolation)
    await queryInterface.addIndex('dead_letter_events', ['user_id'], {
      name: 'idx_dead_letter_events_user_id',
      comment: 'Filter events by user for multi-tenant support'
    });

    // Index for sorting/filtering by creation date
    await queryInterface.addIndex('dead_letter_events', ['created_at'], {
      name: 'idx_dead_letter_events_created_at',
      comment: 'Sort and filter events by creation time'
    });

    // Index for email lookups
    await queryInterface.addIndex('dead_letter_events', ['email'], {
      name: 'idx_dead_letter_events_email',
      comment: 'Find events by contact email address'
    });

    // Composite index for DLQ stats query optimization
    await queryInterface.addIndex('dead_letter_events', ['status', 'event_type'], {
      name: 'idx_dead_letter_events_stats',
      comment: 'Optimize GROUP BY queries for DLQ statistics'
    });

    console.log('[Migration] ✅ dead_letter_events table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('[Migration] Dropping dead_letter_events table...');

    // Drop all indexes first (automatic with CASCADE, but explicit for clarity)
    await queryInterface.removeIndex('dead_letter_events', 'idx_dead_letter_events_status');
    await queryInterface.removeIndex('dead_letter_events', 'idx_dead_letter_events_event_type');
    await queryInterface.removeIndex('dead_letter_events', 'idx_dead_letter_events_user_id');
    await queryInterface.removeIndex('dead_letter_events', 'idx_dead_letter_events_created_at');
    await queryInterface.removeIndex('dead_letter_events', 'idx_dead_letter_events_email');
    await queryInterface.removeIndex('dead_letter_events', 'idx_dead_letter_events_stats');

    // Drop the table
    await queryInterface.dropTable('dead_letter_events');

    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_dead_letter_events_status";');

    console.log('[Migration] ✅ dead_letter_events table dropped successfully');
  }
};
