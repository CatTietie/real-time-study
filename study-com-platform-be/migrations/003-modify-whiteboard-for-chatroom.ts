import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // 直接添加type字段
  try {
    await queryInterface.addColumn('whiteboards', 'type', {
      type: DataTypes.STRING(50),
      defaultValue: 'general',
      allowNull: false,
      comment: '白板类型: general, brainstorming, diagram, sketch'
    });
    console.log('✅ 白板type字段添加成功');
  } catch (error) {
    console.log('⚠️ type字段可能已存在，跳过添加');
  }
  
  console.log('✅ 白板表结构调整完成');
}

export async function down(queryInterface: QueryInterface) {
  // 回滚操作
  await queryInterface.removeColumn('whiteboards', 'type');
  
  await queryInterface.addConstraint('whiteboards', {
    fields: ['room_id'],
    type: 'unique',
    name: 'whiteboards_room_id_unique'
  });
  
  console.log('↩️ 白板表结构回滚完成');
}