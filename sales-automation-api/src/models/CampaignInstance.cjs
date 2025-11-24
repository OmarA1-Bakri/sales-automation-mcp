/**
 * CampaignInstance Model
 * Represents runtime instances of campaign templates with execution tracking
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CampaignInstance = sequelize.define('campaign_instances', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    template_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'campaign_templates',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      field: 'template_id'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'active', 'paused', 'completed', 'failed']]
      }
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at'
    },
    paused_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paused_at'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    total_enrolled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_enrolled'
    },
    total_sent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_sent'
    },
    total_delivered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_delivered'
    },
    total_opened: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_opened'
    },
    total_clicked: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_clicked'
    },
    total_replied: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_replied'
    },
    provider_config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: 'provider_config'
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
    tableName: 'campaign_instances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['template_id'] },
      { fields: ['status'] }
    ]
  });

  // Instance methods
  CampaignInstance.prototype.start = async function(options = {}) {
    if (this.status !== 'draft' && this.status !== 'paused') {
      throw new Error('Can only start campaigns in draft or paused status');
    }
    this.status = 'active';
    this.started_at = new Date();
    return await this.save(options);
  };

  CampaignInstance.prototype.pause = async function(options = {}) {
    if (this.status !== 'active') {
      throw new Error('Can only pause active campaigns');
    }
    this.status = 'paused';
    this.paused_at = new Date();
    return await this.save(options);
  };

  CampaignInstance.prototype.complete = async function(options = {}) {
    if (this.status !== 'active') {
      throw new Error('Can only complete active campaigns');
    }
    this.status = 'completed';
    this.completed_at = new Date();
    return await this.save(options);
  };

  CampaignInstance.prototype.getMetrics = function() {
    const sent = this.total_sent || 0;
    const delivered = this.total_delivered || 0;
    const opened = this.total_opened || 0;
    const clicked = this.total_clicked || 0;
    const replied = this.total_replied || 0;

    return {
      enrolled: this.total_enrolled,
      sent,
      delivered,
      opened,
      clicked,
      replied,
      delivery_rate: sent > 0 ? parseFloat((delivered / sent * 100).toFixed(2)) : 0,
      open_rate: delivered > 0 ? parseFloat((opened / delivered * 100).toFixed(2)) : 0,
      click_rate: delivered > 0 ? parseFloat((clicked / delivered * 100).toFixed(2)) : 0,
      reply_rate: delivered > 0 ? parseFloat((replied / delivered * 100).toFixed(2)) : 0,
      click_through_rate: opened > 0 ? parseFloat((clicked / opened * 100).toFixed(2)) : 0
    };
  };

  // Class methods
  CampaignInstance.findActive = function(options = {}) {
    return this.findAll({
      where: { status: 'active' },
      ...options
    });
  };

  return CampaignInstance;
};
