/**
 * Migration: Create API Keys and API Key Logs Tables
 * Implements secure API key management with Argon2id hashing
 * 
 * Tables:
 * - api_keys: Stores hashed API keys with rotation support
 * - api_key_logs: Audit trail for all key events
 */

module.exports = {
  /**
   * Run migration
   */
  async up(queryInterface, Sequelize) {
    // ========================================================================
    // API KEYS TABLE
    // ========================================================================
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      // Key Identification
      prefix: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
        comment: 'Public key prefix for lookup (e.g., sk_live_v2_abc123)'
      },

      key_hash: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Argon2id hash of the secret portion'
      },

      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Human-readable key name/description'
      },

      // Versioning
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'Key version for rotation tracking'
      },

      // Lifecycle
      status: {
        type: Sequelize.ENUM('active', 'rotating', 'expired', 'revoked'),
        defaultValue: 'active',
        allowNull: false
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'NULL = never expires'
      },

      last_rotated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last rotation timestamp'
      },

      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Manual revocation timestamp'
      },

      // Grace period support
      grace_period_ends_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Old key valid until this time'
      },

      // Ownership
      user_id: {
        type: Sequelize.UUID,
        allowNull: true
      },

      // Usage tracking
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },

      // Security
      ip_whitelist: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of allowed IPs (null = all IPs allowed)'
      },

      scopes: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: false,
        comment: 'Permissions array: ["read:users", "write:products"]'
      },

      // Timestamps
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

    // Indexes for api_keys
    await queryInterface.addIndex('api_keys', ['prefix'], {
      unique: true,
      name: 'api_keys_prefix_unique'
    });

    await queryInterface.addIndex('api_keys', ['status'], {
      name: 'api_keys_status_idx'
    });

    await queryInterface.addIndex('api_keys', ['expires_at'], {
      name: 'api_keys_expires_at_idx'
    });

    await queryInterface.addIndex('api_keys', ['user_id'], {
      name: 'api_keys_user_id_idx'
    });

    // ========================================================================
    // API KEY LOGS TABLE
    // ========================================================================
    await queryInterface.createTable('api_key_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      api_key_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'api_keys',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'created, used, rotated, revoked, expired'
      },

      ip_address: {
        type: Sequelize.INET,
        allowNull: true
      },

      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      endpoint: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },

      // Timestamp (no updated_at for logs)
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes for api_key_logs
    await queryInterface.addIndex('api_key_logs', ['api_key_id'], {
      name: 'api_key_logs_api_key_id_idx'
    });

    await queryInterface.addIndex('api_key_logs', ['event_type'], {
      name: 'api_key_logs_event_type_idx'
    });

    await queryInterface.addIndex('api_key_logs', ['created_at'], {
      name: 'api_key_logs_created_at_idx'
    });

    console.log('[Migration] ✅ API Keys tables created successfully');
  },

  /**
   * Rollback migration
   */
  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (foreign key constraint)
    await queryInterface.dropTable('api_key_logs');
    await queryInterface.dropTable('api_keys');

    console.log('[Migration] ✅ API Keys tables dropped successfully');
  }
};
