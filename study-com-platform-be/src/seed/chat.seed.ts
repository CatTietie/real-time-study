import ChatRoom from "../models/chat-room.model";
import User from "../models/user.model";

export const seedChatRooms = async () => {
  try {
    // 检查是否已有聊天室
    const existingRooms = await ChatRoom.count();
    if (existingRooms > 0) {
      console.log('💬 聊天室数据已存在，跳过初始化');
      return;
    }

    // 查找管理员用户作为创建者
    const adminUser = await User.findOne({
      where: {
        role: 'admin'
      }
    });

    if (!adminUser) {
      console.log('⚠️ 未找到管理员用户，使用默认用户ID 1');
    }

    const chatRooms = [
      {
        name: '学习交流大厅',
        type: 'public',
        max_users: 100,
        created_by: adminUser?.id || 1
      },
      {
        name: '编程技术讨论',
        type: 'study_group',
        max_users: 50,
        created_by: adminUser?.id || 1
      },
      {
        name: '考研备战群',
        type: 'study_group',
        max_users: 30,
        created_by: adminUser?.id || 1
      },
      {
        name: '英语学习角',
        type: 'study_group',
        max_users: 40,
        created_by: adminUser?.id || 1
      }
    ];

    for (const roomData of chatRooms) {
      await ChatRoom.create(roomData);
      console.log(`✅ 创建聊天室: ${roomData.name}`);
    }

    console.log('🎉 聊天室初始化完成');
  } catch (error) {
    console.error('❌ 聊天室初始化失败:', error);
  }
};