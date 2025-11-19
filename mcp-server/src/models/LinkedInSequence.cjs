/**
 * LinkedInSequence Model
 * Represents LinkedIn action sequences for campaigns
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LinkedInSequence = sequelize.define('linkedin_sequences', {
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
    step_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      field: 'step_number'
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['profile_visit', 'connection_request', 'message', 'voice_message']]
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1500] // LinkedIn message limit
      }
    },
    delay_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 720 // 30 days max
      },
      field: 'delay_hours'
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
    tableName: 'linkedin_sequences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['template_id'] },
      { fields: ['template_id', 'step_number'] }
    ],
    validate: {
      messageRequiredForMessageTypes() {
        if (['connection_request', 'message', 'voice_message'].includes(this.type) && !this.message) {
          throw new Error('Message is required for connection_request, message, and voice_message types');
        }
      },
      connectionRequestLength() {
        if (this.type === 'connection_request' && this.message && this.message.length > 300) {
          throw new Error('Connection request message must be 300 characters or less');
        }
      }
    }
  });

  return LinkedInSequence;
};
