/**
 * ApiKeyLog Model - Audit Trail for API Key Usage
 * Tracks all API key events (creation, usage, rotation, revocation)
 */

module.exports = (sequelize, DataTypes) => {
  const ApiKeyLog = sequelize.define('ApiKeyLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    apiKeyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'api_key_id',
      references: {
        model: 'api_keys',
        key: 'id'
      }
    },

    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'event_type',
      comment: 'created, used, rotated, revoked, expired'
    },

    ipAddress: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'ip_address'
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },

    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code'
    },

    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'api_key_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,  // No updated_at for logs
    indexes: [
      { fields: ['api_key_id'] },
      { fields: ['event_type'] },
      { fields: ['created_at'] }
    ]
  });

  return ApiKeyLog;
};
