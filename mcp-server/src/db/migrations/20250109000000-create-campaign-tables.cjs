'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create campaign_templates table
    await queryInterface.createTable('campaign_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      path_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      icp_profile_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for campaign_templates
    await queryInterface.addIndex('campaign_templates', ['type']);
    await queryInterface.addIndex('campaign_templates', ['is_active']);
    await queryInterface.addIndex('campaign_templates', ['created_at']);

    // Create campaign_instances table
    await queryInterface.createTable('campaign_instances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_templates',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'draft'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paused_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_enrolled: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_sent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_opened: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_clicked: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_replied: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      provider_config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for campaign_instances
    await queryInterface.addIndex('campaign_instances', ['template_id']);
    await queryInterface.addIndex('campaign_instances', ['status']);
    await queryInterface.addIndex('campaign_instances', ['created_at']);
    // Composite index with status first for queries like: WHERE status = 'active' AND template_id = X
    await queryInterface.addIndex('campaign_instances', ['status', 'template_id']);

    // Create email_sequences table
    await queryInterface.createTable('email_sequences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_templates',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      delay_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      a_b_variant: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for email_sequences
    await queryInterface.addIndex('email_sequences', ['template_id']);
    await queryInterface.addIndex('email_sequences', ['template_id', 'step_number'], {
      unique: true,
      name: 'email_sequences_template_step_unique'
    });

    // Create linkedin_sequences table
    await queryInterface.createTable('linkedin_sequences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_templates',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      delay_hours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for linkedin_sequences
    await queryInterface.addIndex('linkedin_sequences', ['template_id']);
    await queryInterface.addIndex('linkedin_sequences', ['template_id', 'step_number'], {
      unique: true,
      name: 'linkedin_sequences_template_step_unique'
    });

    // Create campaign_enrollments table
    await queryInterface.createTable('campaign_enrollments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      instance_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_instances',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      contact_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'enrolled'
      },
      current_step: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      next_action_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      enrolled_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      unsubscribed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for campaign_enrollments
    await queryInterface.addIndex('campaign_enrollments', ['instance_id']);
    await queryInterface.addIndex('campaign_enrollments', ['contact_id']);
    await queryInterface.addIndex('campaign_enrollments', ['status']);
    await queryInterface.addIndex('campaign_enrollments', ['instance_id', 'contact_id'], {
      unique: true,
      name: 'campaign_enrollments_instance_contact_unique'
    });
    // Composite index for job worker queries (WHERE status = 'active' AND next_action_at <= NOW())
    await queryInterface.addIndex('campaign_enrollments', ['status', 'next_action_at'], {
      name: 'campaign_enrollments_status_next_action_idx'
    });
    // Composite index for filtering enrollments by instance and status
    await queryInterface.addIndex('campaign_enrollments', ['instance_id', 'status']);

    // Create campaign_events table
    await queryInterface.createTable('campaign_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      enrollment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'campaign_enrollments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      channel: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      step_number: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      provider_event_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for campaign_events
    await queryInterface.addIndex('campaign_events', ['enrollment_id']);
    await queryInterface.addIndex('campaign_events', ['event_type']);
    await queryInterface.addIndex('campaign_events', ['timestamp']);
    await queryInterface.addIndex('campaign_events', ['provider_event_id']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to respect foreign key constraints
    await queryInterface.dropTable('campaign_events');
    await queryInterface.dropTable('campaign_enrollments');
    await queryInterface.dropTable('linkedin_sequences');
    await queryInterface.dropTable('email_sequences');
    await queryInterface.dropTable('campaign_instances');
    await queryInterface.dropTable('campaign_templates');
  }
};
