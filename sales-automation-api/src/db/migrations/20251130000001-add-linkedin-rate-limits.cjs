'use strict';

/**
 * Migration: Add LinkedIn Rate Limits Table
 *
 * P0 SECURITY: Tracks daily rate limits for PhantomBuster LinkedIn actions
 * to prevent account bans from exceeding LinkedIn's automation limits.
 *
 * Features:
 * - Per-account tracking (supports multiple LinkedIn accounts)
 * - Timezone-aware (uses LinkedIn HQ time: America/Los_Angeles)
 * - Row-level locking support for concurrent updates
 * - CHECK constraints to prevent negative values
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('linkedin_rate_limits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      account_identifier: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Hash of LinkedIn session cookie to identify account'
      },
      timezone: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'America/Los_Angeles',
        comment: 'Timezone for daily reset (LinkedIn HQ time)'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date for which limits apply'
      },
      connections_sent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of connection requests sent today'
      },
      messages_sent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of messages sent today'
      },
      profile_visits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of profile visits today'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Unique constraint on account + date
    await queryInterface.addConstraint('linkedin_rate_limits', {
      fields: ['account_identifier', 'date'],
      type: 'unique',
      name: 'uq_linkedin_rate_limits_account_date'
    });

    // Index for fast lookups
    await queryInterface.addIndex('linkedin_rate_limits', {
      fields: ['account_identifier', 'date'],
      name: 'idx_linkedin_rate_limits_lookup'
    });

    // Add CHECK constraints (PostgreSQL only)
    const isPostgres = queryInterface.sequelize.options.dialect === 'postgres';
    if (isPostgres) {
      await queryInterface.sequelize.query(`
        ALTER TABLE linkedin_rate_limits
        ADD CONSTRAINT chk_connections_sent_non_negative CHECK (connections_sent >= 0),
        ADD CONSTRAINT chk_messages_sent_non_negative CHECK (messages_sent >= 0),
        ADD CONSTRAINT chk_profile_visits_non_negative CHECK (profile_visits >= 0);
      `);
    }

    console.log('✓ Created linkedin_rate_limits table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('linkedin_rate_limits');
    console.log('✓ Dropped linkedin_rate_limits table');
  }
};
