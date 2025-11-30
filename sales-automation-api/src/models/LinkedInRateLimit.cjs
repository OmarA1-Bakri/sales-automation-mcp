/**
 * LinkedInRateLimit Model
 *
 * Tracks daily rate limits for PhantomBuster LinkedIn actions
 * to prevent account bans from exceeding LinkedIn's automation limits.
 *
 * Features:
 * - Per-account tracking (supports multiple LinkedIn accounts)
 * - Timezone-aware (uses LinkedIn HQ time: America/Los_Angeles)
 * - Row-level locking support for concurrent updates
 *
 * @see src/providers/phantombuster/PhantombusterLinkedInProvider.js
 * @see src/db/migrations/20251130000001-add-linkedin-rate-limits.cjs
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LinkedInRateLimit = sequelize.define('LinkedInRateLimit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    account_identifier: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Hash of LinkedIn session cookie to identify account'
    },

    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'America/Los_Angeles',
      comment: 'Timezone for daily reset (LinkedIn HQ time)'
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date for which limits apply'
    },

    connections_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of connection requests sent today',
      validate: {
        min: 0
      }
    },

    messages_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of messages sent today',
      validate: {
        min: 0
      }
    },

    profile_visits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of profile visits today',
      validate: {
        min: 0
      }
    }

  }, {
    tableName: 'linkedin_rate_limits',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['account_identifier', 'date'],
        name: 'uq_linkedin_rate_limits_account_date'
      },
      {
        fields: ['account_identifier', 'date'],
        name: 'idx_linkedin_rate_limits_lookup'
      }
    ],
    comment: 'Daily rate limit tracking for LinkedIn actions via PhantomBuster'
  });

  // Class methods for cleanup
  /**
   * Delete old rate limit records to prevent table bloat
   * Records older than specified days are removed
   * @param {number} olderThanDays - Delete records older than this many days (default 30)
   * @returns {Promise<number>} Number of deleted rows
   */
  LinkedInRateLimit.cleanupOldRecords = async function(olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const deleted = await this.destroy({
      where: {
        date: { [sequelize.Sequelize.Op.lt]: cutoffDateStr }
      }
    });

    return deleted;
  };

  return LinkedInRateLimit;
};
