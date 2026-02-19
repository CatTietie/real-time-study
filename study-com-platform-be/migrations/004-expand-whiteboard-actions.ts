import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // 更新白板动作类型的枚举值
  try {
    // 注意：MySQL中修改ENUM类型需要重建表或使用ALTER TABLE MODIFY
    // 这里我们采用安全的方式：先添加新列，复制数据，然后替换
    
    // 添加临时列
    await queryInterface.addColumn('whiteboard_actions', 'action_type_new', {
      type: DataTypes.ENUM('draw', 'erase', 'text', 'shape', 'image', 'clear', 'undo', 'redo'),
      allowNull: false,
      defaultValue: 'draw'
    });
    
    // 复制数据
    await queryInterface.sequelize.query(`
      UPDATE whiteboard_actions 
      SET action_type_new = action_type
      WHERE action_type IN ('draw', 'erase', 'clear', 'undo', 'redo')
    `);
    
    // 删除旧列
    await queryInterface.removeColumn('whiteboard_actions', 'action_type');
    
    // 重命名新列为原名列
    await queryInterface.renameColumn('whiteboard_actions', 'action_type_new', 'action_type');
    
    console.log('✅ 白板动作类型枚举更新成功');
  } catch (error) {
    console.log('⚠️ 动作类型枚举更新可能遇到问题:', error);
  }
}

export async function down(queryInterface: QueryInterface) {
  // 回滚到原来的枚举值
  try {
    await queryInterface.changeColumn('whiteboard_actions', 'action_type', {
      type: DataTypes.ENUM('draw', 'erase', 'clear', 'undo', 'redo'),
      allowNull: false
    });
    
    console.log('↩️ 白板动作类型枚举回滚完成');
  } catch (error) {
    console.log('⚠️ 动作类型枚举回滚遇到问题:', error);
  }
}