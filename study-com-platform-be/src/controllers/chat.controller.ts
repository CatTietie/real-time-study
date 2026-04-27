import { Request, Response } from "express";
import ChatRoom from "../models/chat-room.model";
import ChatMessage from "../models/chat-message.model";
import User from "../models/user.model";
import { Op } from "sequelize";
import { uploadChatFileToOss } from "../middlewares/upload.middleware";
import { broadcastToRoom } from "../utils/socketManager";

const ALLOWED_IMAGE_DOMAINS = [
  'weblog-dev.oss-cn-beijing.aliyuncs.com',
  'localhost',
  '127.0.0.1'
];

const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_IMAGE_DOMAINS.some(domain => 
      parsedUrl.hostname.includes(domain)
    );
  } catch {
    return false;
  }
};

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
    const { page = 1, limit = 50, beforeId, startTime, endTime } = req.query;
    
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
    
    // 如果提供了时间范围，则按时间范围查询
    if (startTime) {
      whereCondition.created_at = whereCondition.created_at || {};
      whereCondition.created_at[Op.gte] = new Date(String(startTime));
    }
    if (endTime) {
      whereCondition.created_at = whereCondition.created_at || {};
      whereCondition.created_at[Op.lte] = new Date(String(endTime));
    }
    
    // 查询消息
    const messages = await ChatMessage.findAndCountAll({
      where: whereCondition,
      include: [{
        model: User,
        attributes: ['id', 'username', 'nickname', 'avatar']
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
        avatar: user?.avatar || null,
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
        attributes: ['id', 'username', 'nickname', 'avatar']
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
        avatar: user?.avatar || null,
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

// 转发消息
export const forwardMessage = async (req: Request, res: Response) => {
  try {
    const { messageId, targetRoomId } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!messageId || !targetRoomId) {
      return res.status(400).json({
        success: false,
        message: "消息ID和目标房间ID不能为空"
      });
    }

    // 查找原消息
    const originalMessage = await ChatMessage.findByPk(messageId, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'nickname']
      }]
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: "消息不存在"
      });
    }

    // 验证目标房间是否存在
    const targetRoom = await ChatRoom.findByPk(targetRoomId);
    if (!targetRoom) {
      return res.status(404).json({
        success: false,
        message: "目标聊天室不存在"
      });
    }

    const originalMsgJson = originalMessage.toJSON() as any;
    const originalUser = originalMsgJson.User;

    // 构建转发内容
    let forwardContent = '';
    if (originalMsgJson.message_type === 'text') {
      forwardContent = originalMsgJson.content;
    } else if (originalMsgJson.message_type === 'image') {
      forwardContent = originalMsgJson.file_url || originalMsgJson.content;
    } else if (originalMsgJson.message_type === 'file') {
      forwardContent = originalMsgJson.file_url || originalMsgJson.content;
    }

    // 创建新消息（转发标记）
    const newMessage = await ChatMessage.create({
      room_id: targetRoomId,
      user_id: userId,
      content: forwardContent,
      message_type: originalMsgJson.message_type,
      // 可以添加转发来源标记
    });

    const forwardedData = {
      ...newMessage.toJSON(),
      username: username,
      user_id: userId,
      created_at: new Date().toISOString(),
      message_type: originalMsgJson.message_type,
      file_name: originalMsgJson.file_name,
      file_size: originalMsgJson.file_size,
      file_url: originalMsgJson.file_url,
      // 转发来源信息
      forwarded_from: {
        originalMessageId: originalMsgJson.id,
        originalRoomId: originalMsgJson.room_id,
        originalUserId: originalMsgJson.user_id,
        originalUsername: originalUser?.username || `用户${originalMsgJson.user_id}`,
        originalNickname: originalUser?.nickname
      }
    };

    // 通过 Socket 广播到目标房间
    broadcastToRoom(targetRoomId, 'new_chat_message', forwardedData);

    res.json({
      success: true,
      message: "消息转发成功",
      data: {
        targetRoomId: targetRoomId,
        targetRoomName: targetRoom.name,
        forwardedMessage: forwardedData
      }
    });

  } catch (error) {
    console.error('转发消息失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "转发消息失败"
    });
  }
};

// 删除消息
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: "消息ID不能为空"
      });
    }

    // 查找消息
    const message = await ChatMessage.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "消息不存在"
      });
    }

    // 检查权限：只能删除自己发送的消息
    if (message.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "只能删除自己发送的消息"
      });
    }

    // 删除消息
    await message.destroy();

    res.json({
      success: true,
      message: "消息删除成功",
      data: {
        messageId: message.id,
        roomId: message.room_id
      }
    });

  } catch (error) {
    console.error('删除消息失败:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "删除消息失败"
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

// 图片代理接口 - 解决跨域图片复制问题
export const proxyImage = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: "图片URL不能为空"
      });
    }

    if (!isValidImageUrl(url)) {
      return res.status(403).json({
        success: false,
        message: "不允许访问的图片域名"
      });
    }

    console.log(`[Image Proxy] 代理图片请求: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'image/*'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `图片获取失败: ${response.status} ${response.statusText}`
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(buffer);
    
    console.log(`[Image Proxy] 图片代理成功: ${contentType}, size: ${buffer.length} bytes`);

  } catch (error: unknown) {
    console.error('[Image Proxy] 图片代理失败:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: "图片请求超时"
      });
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "图片代理失败"
    });
  }
};

// 获取图片 base64 数据接口
export const getImageBase64 = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: "图片URL不能为空"
      });
    }

    if (!isValidImageUrl(url)) {
      return res.status(403).json({
        success: false,
        message: "不允许访问的图片域名"
      });
    }

    console.log(`[Image Base64] 获取图片: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `图片获取失败: ${response.status} ${response.statusText}`
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Data}`;

    console.log(`[Image Base64] 成功获取图片: ${contentType}, size: ${base64Data.length} chars`);

    res.json({
      success: true,
      data: {
        base64: base64Data,
        dataUrl: dataUrl,
        mimeType: contentType
      }
    });

  } catch (error: unknown) {
    console.error('[Image Base64] 获取图片失败:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: "图片请求超时"
      });
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取图片失败"
    });
  }
};
