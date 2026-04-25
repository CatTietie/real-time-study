'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'forward_post_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '转发的原帖ID',
      references: {
        model: 'posts',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('posts', 'forward_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '被转发的原作者ID',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('posts', ['forward_post_id']);
    await queryInterface.addIndex('posts', ['forward_user_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('posts', 'forward_post_id');
    await queryInterface.removeColumn('posts', 'forward_user_id');
  }
};