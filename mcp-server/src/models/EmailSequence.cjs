/**
 * EmailSequence Model
 * Represents email sequence steps for campaigns
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmailSequence = sequelize.define('email_sequences', {
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
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 50000]
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
    a_b_variant: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'a_b_variant'
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
    tableName: 'email_sequences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    freezeTableName: true,
    indexes: [
      { fields: ['template_id'] },
      { fields: ['template_id', 'step_number'] }
    ]
  });

  return EmailSequence;
};
