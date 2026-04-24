import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn('posts', 'forward_post_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '转发的原帖ID',
    references: {
      model: 'posts',
      key: 'id',
    },
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('posts', 'forward_user_id', {
    type: DataTypes.INTEGER,
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
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn('posts', 'forward_post_id');
  await queryInterface.removeColumn('posts', 'forward_user_id');
}
