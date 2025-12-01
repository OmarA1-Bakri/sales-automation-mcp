/**
 * ICPProfile Model
 * Represents Ideal Customer Profile definitions for lead scoring and targeting
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ICPProfile = sequelize.define('icp_profiles', {
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
    tier: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'core',
      validate: {
        isIn: [['core', 'expansion', 'strategic']]
      }
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Firmographic criteria stored as JSONB
    firmographics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        companySize: { min: 0, max: 0 },
        revenue: { min: 0, max: 0 },
        industries: [],
        geographies: []
      }
    },
    // Target job titles
    titles: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        primary: [],
        secondary: []
      }
    },
    // Scoring thresholds
    scoring: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        autoApprove: 0.85,
        reviewRequired: 0.70,
        disqualify: 0.50
      }
    },
    // Performance statistics
    stats: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        discovered: 0,
        enriched: 0,
        enrolled: 0,
        avgScore: 0
      }
    },
    created_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'created_by'
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
    tableName: 'icp_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['tier'] },
      { fields: ['active'] },
      { fields: ['name'], unique: true }
    ]
  });

  // Instance methods
  ICPProfile.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  // Class methods
  ICPProfile.findActive = function(options = {}) {
    return this.findAll({
      where: { active: true },
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  ICPProfile.findByTier = function(tier, options = {}) {
    return this.findAll({
      where: { tier, active: true },
      ...options
    });
  };

  return ICPProfile;
};
