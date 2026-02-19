import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // 为 chat_messages 表添加 updated_at 字段
  await queryInterface.addColumn('chat_messages', 'updated_at', {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  });
}

export async function down(queryInterface: QueryInterface) {
  // 删除 updated_at 字段
  await queryInterface.removeColumn('chat_messages', 'updated_at');
}