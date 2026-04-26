import { Request, Response } from "express";
import ChatRoom from "../models/chat-room.model";
import ChatMessage from "../models/chat-message.model";
import User from "../models/user.model";
import { Op } from "sequelize";
import { uploadChatFileToOss } from "../middlewares/upload.middleware";

export const createChatRoom = async (req: Request, res: Response) => {
  try {
    const { name, type, maxUsers } = req.body;
    const userId = req.user?.id;

    const room = await ChatRoom.create({
      name,
      type: type || 'study_group',
      max_users: maxUsers || 50,
      created_by: userId
    });

    res.json({
      success: true,
      message: "聊天室创建成功",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建失败"
    });
  }
};

export const getChatRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await ChatRoom.findAll({
      include: [{
        association: 'createdBy',
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取失败"
    });
  }
};

export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const messages = await ChatMessage.findAndCountAll({
      where: { room_id: roomId },
      include: [{
        association: 'user',
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'ASC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    });

    res.json({
      success: true,
      data: messages.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: messages.count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取消息失败"
    });
  }
};

// 获取在线用户列表
export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    // 这里应该从Socket服务中获取实际在线用户
    // 暂时返回空数组，后续在Socket服务中实现
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取在线用户失败"
    });
  }
};

// 获取聊天室历史消息（分页）
export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50, beforeId } = req.query;
    
    // 验证房间是否存在
    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "聊天室不存在"
      });
    }
    
    // 构建查询条件
    const whereCondition: any = { room_id: roomId };
    
    // 如果提供了beforeId，则查询该ID之前的消息
    if (beforeId) {
      whereCondition.id = { [Op.lt]: Number(beforeId) };
    }
    
    // 查询消息
    const messages = await ChatMessage.findAndCountAll({
      where: whereCondition,
      include: [{
        model: User,
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });
    
    // 处理消息数据
    const processedMessages = messages.rows.map(msg => {
      const msgJson: any = msg.toJSON();
      const user = msgJson.User; // 注意：Sequelize关联查询返回的字段名是User（首字母大写）
      console.log('处理单条消息:', { msgJson, user });
      return {
        ...msgJson,
        username: user?.username || `用户${msgJson.user_id}`,
        nickname: user?.nickname || null,
        created_at: msgJson.createdAt || msgJson.created_at
      };
    });
    
    res.json({
      success: true,
      data: {
        messages: processedMessages.reverse(), // 按时间正序返回
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: messages.count,
          hasNext: Number(page) * Number(limit) < messages.count
        }
      }
    });
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取聊天历史失败"
    });
  }
};

// 搜索聊天室消息
export const searchChatMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { keyword, page = 1, limit = 20 } = req.query;
    
    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        success: false,
        message: "请提供搜索关键词"
      });
    }
    
    // 验证房间是否存在
    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "聊天室不存在"
      });
    }
    
    // 搜索消息
    const messages = await ChatMessage.findAndCountAll({
      where: {
        room_id: roomId,
        content: {
          [Op.like]: `%${keyword}%`
        }
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });
    
    // 处理消息数据
    const processedMessages = messages.rows.map(msg => {
      const msgJson: any = msg.toJSON();
      const user = msgJson.User; // 注意：Sequelize关联查询返回的字段名是User（首字母大写）
      console.log('处理单条消息:', { msgJson, user });
      return {
        ...msgJson,
        username: user?.username || `用户${msgJson.user_id}`,
        nickname: user?.nickname || null,
        created_at: msgJson.createdAt || msgJson.created_at
      };
    });
    
    res.json({
      success: true,
      data: {
        messages: processedMessages.reverse(),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: messages.count
        },
        keyword
      }
    });
  } catch (error) {
    console.error('搜索聊天消息失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "搜索失败"
    });
  }
};

// 删除聊天室（仅创建者可以删除）
export const deleteChatRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "聊天室不存在"
      });
    }

    // 检查是否为创建者
    if (room.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "只有创建者才能删除聊天室"
      });
    }

    // 删除聊天室及相关消息
    await ChatMessage.destroy({ where: { room_id: roomId } });
    await room.destroy();

    res.json({
      success: true,
      message: "聊天室删除成功"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "删除失败"
    });
  }
};

// 退出聊天室
export const leaveChatRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "聊天室不存在"
      });
    }

    // 检查是否为创建者（创建者不能退出自己的房间）
    if (room.created_by === userId) {
      return res.status(400).json({
        success: false,
        message: "创建者不能退出自己创建的聊天室"
      });
    }

    // 这里可以在数据库中记录用户退出行为
    // 暂时只返回成功消息
    res.json({
      success: true,
      message: "退出聊天室成功"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "退出失败"
    });
  }
};

// 直接拉用户进入聊天室
export const addUserToRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const inviterId = req.user?.id;

    const room = await ChatRoom.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "聊天室不存在"
      });
    }

    // 检查被拉入用户是否存在
    const invitedUser = await User.findByPk(userId);
    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    // 检查邀请者是否有权限（创建者或已加入的成员）
    if (room.created_by !== inviterId) {
      // 这里可以检查是否是已加入的成员
      // 暂时允许所有成员拉人
    }

    // 生成系统消息
    const systemMessage = `${req.user?.username || '某用户'} 将 ${invitedUser.username} 拉入了聊天室`;
    
    // 返回成功信息
    res.json({
      success: true,
      message: "用户已加入聊天室",
      data: {
        roomId: room.id,
        roomName: room.name,
        inviterId,
        invitedUserId: userId,
        invitedUsername: invitedUser.username,
        systemMessage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "操作失败"
    });
  }
};

// 获取可邀请的用户列表
export const getAvailableUsers = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    // 获取所有学生用户（排除当前用户）
    const users = await User.findAll({
      where: {
        role: 'student'
      },
      attributes: ['id', 'username', 'nickname'],
      order: [['username', 'ASC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取用户列表失败"
    });
  }
};

// 聊天文件上传
export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "未授权访问"
      });
    }

    // 上传文件到 OSS 或本地存储
    const fileInfo = await uploadChatFileToOss(req);
    
    if (!fileInfo) {
      return res.status(400).json({
        success: false,
        message: "请选择要上传的文件"
      });
    }

    console.log(`✅ 文件上传成功: ${fileInfo.file_name} (${fileInfo.file_size} bytes)`);

    res.json({
      success: true,
      message: "文件上传成功",
      data: {
        file_name: fileInfo.file_name,
        file_url: fileInfo.file_url,
        file_size: fileInfo.file_size,
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "文件上传失败"
    });
  }
};
