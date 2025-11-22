/**
 * CampaignEnrollment Model
 * Tracks individual contact enrollments in campaigns
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const CampaignEnrollment = sequelize.define('campaign_enrollments', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    instance_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'campaign_instances',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      field: 'instance_id'
    },
    contact_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'contact_id'
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'enrolled',
      validate: {
        isIn: [['enrolled', 'active', 'paused', 'completed', 'unsubscribed', 'bounced']]
      }
    },
    current_step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'current_step'
    },
    next_action_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_action_at'
    },
    enrolled_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'enrolled_at'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    unsubscribed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'unsubscribed_at'
    },
    provider_message_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_message_id'
    },
    provider_action_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'provider_action_id'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
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
    tableName: 'campaign_enrollments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['instance_id'] },
      { fields: ['contact_id'] },
      { fields: ['status'] },
      {
        fields: ['next_action_at'],
        where: {
          status: 'active',
          next_action_at: { [Op.ne]: null }
        }
      },
      // PHASE 3 FIX (P3.2): Add unique constraint to prevent duplicate enrollments
      // Prevents race condition where two concurrent requests could enroll the same contact
      {
        unique: true,
        fields: ['instance_id', 'contact_id'],
        name: 'unique_instance_contact'
      }
    ]
  });

  // Instance methods
  CampaignEnrollment.prototype.unsubscribe = async function() {
    this.status = 'unsubscribed';
    this.unsubscribed_at = new Date();
    return await this.save();
  };

  CampaignEnrollment.prototype.markBounced = async function() {
    this.status = 'bounced';
    return await this.save();
  };

  CampaignEnrollment.prototype.advanceStep = async function() {
    this.current_step += 1;
    return await this.save();
  };

  return CampaignEnrollment;
};
