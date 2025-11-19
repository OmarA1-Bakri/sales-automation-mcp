/**
 * Migration: Add total_delivered column to campaign_instances
 *
 * Purpose: Separate delivered counter from sent counter for accurate metrics
 * - total_sent: Emails/messages sent from our system
 * - total_delivered: Emails/messages successfully delivered (confirmed by provider)
 *
 * This enables accurate calculation of:
 * - Delivery rate: (delivered / sent) * 100
 * - Open rate: (opened / delivered) * 100  (more accurate than opened / sent)
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('campaign_instances', 'total_delivered', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of messages successfully delivered (confirmed by provider)'
    });

    // For existing instances, set total_delivered = total_sent as a reasonable default
    // This assumes most sent messages were delivered (which is typical)
    await queryInterface.sequelize.query(`
      UPDATE campaign_instances
      SET total_delivered = total_sent
      WHERE total_sent > 0
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('campaign_instances', 'total_delivered');
  }
};
