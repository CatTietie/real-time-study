import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // 检查并添加索引以提高查询性能
  try {
    // 为聊天消息表添加复合索引
    await queryInterface.addIndex('chat_messages', ['room_id', 'created_at'], {
      name: 'idx_chat_messages_room_created'
    });
    
    // 为用户ID添加索引
    await queryInterface.addIndex('chat_messages', ['user_id'], {
      name: 'idx_chat_messages_user'
    });
    
    // 为消息类型添加索引
    await queryInterface.addIndex('chat_messages', ['message_type'], {
      name: 'idx_chat_messages_type'
    });
    
    console.log('✅ 聊天消息表索引创建完成');
  } catch (error) {
    console.log('⚠️ 索引可能已存在:', error);
  }

  // 检查是否需要添加updated_at字段
  try {
    const tableDescription = await queryInterface.describeTable('chat_messages');
    if (!tableDescription.updated_at) {
      await queryInterface.addColumn('chat_messages', 'updated_at', {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      });
      console.log('✅ 添加updated_at字段到chat_messages表');
    }
  } catch (error) {
    console.log('⚠️ updated_at字段可能已存在:', error);
  }
}

export async function down(queryInterface: QueryInterface) {
  // 删除索引
  try {
    await queryInterface.removeIndex('chat_messages', 'idx_chat_messages_room_created');
    await queryInterface.removeIndex('chat_messages', 'idx_chat_messages_user');
    await queryInterface.removeIndex('chat_messages', 'idx_chat_messages_type');
    console.log('✅ 聊天消息表索引已删除');
  } catch (error) {
    console.log('⚠️ 删除索引时出错:', error);
  }

  // 删除updated_at字段
  try {
    await queryInterface.removeColumn('chat_messages', 'updated_at');
    console.log('✅ updated_at字段已从chat_messages表删除');
  } catch (error) {
    console.log('⚠️ 删除updated_at字段时出错:', error);
  }
}