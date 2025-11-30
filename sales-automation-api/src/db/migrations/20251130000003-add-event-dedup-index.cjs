'use strict';

/**
 * Migration: Add Event Deduplication Index
 *
 * P1: Prevents duplicate webhook events from being stored.
 * Uses partial unique index on provider_event_id (only where not null).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const isPostgres = queryInterface.sequelize.options.dialect === 'postgres';

    if (isPostgres) {
      // PostgreSQL supports partial unique indexes
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_events_dedup
        ON campaign_events (provider_event_id)
        WHERE provider_event_id IS NOT NULL;
      `);
      console.log('✓ Created partial unique index idx_campaign_events_dedup');
    } else {
      // SQLite/MySQL - just create a regular index (dedup handled in app logic)
      await queryInterface.addIndex('campaign_events', {
        fields: ['provider_event_id'],
        name: 'idx_campaign_events_provider_event_id'
      });
      console.log('✓ Created index idx_campaign_events_provider_event_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const isPostgres = queryInterface.sequelize.options.dialect === 'postgres';

    if (isPostgres) {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_campaign_events_dedup;
      `);
    } else {
      await queryInterface.removeIndex('campaign_events', 'idx_campaign_events_provider_event_id');
    }

    console.log('✓ Removed event deduplication index');
  }
};
