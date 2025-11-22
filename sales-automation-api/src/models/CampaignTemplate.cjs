/**
 * CampaignTemplate Model
 * Represents reusable campaign templates supporting structured and dynamic_ai paths
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CampaignTemplate = sequelize.define('campaign_templates', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['email', 'linkedin', 'multi_channel']]
      }
    },
    path_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['structured', 'dynamic_ai']]
      }
    },
    icp_profile_id: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'icp_profile_id'
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    created_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'created_by'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'campaign_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['type'] },
      { fields: ['path_type'] },
      { fields: ['is_active'] }
    ]
  });

  // Instance methods
  CampaignTemplate.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    // Convert snake_case to camelCase for API responses if needed
    return values;
  };

  // Class methods
  CampaignTemplate.findActive = function(options = {}) {
    return this.findAll({
      where: { is_active: true },
      ...options
    });
  };

  CampaignTemplate.findByType = function(type, options = {}) {
    return this.findAll({
      where: { type, is_active: true },
      ...options
    });
  };

  return CampaignTemplate;
};
