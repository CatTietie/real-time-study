import { Server, Socket } from 'socket.io';
import ChatMessage from '../models/chat-message.model';
import ChatRoom from '../models/chat-room.model';
import User from '../models/user.model';

interface ClientInfo {
  userId: number;
  username: string;
  nickname?: string;
  roomId: number;
  joinTime: Date;
  status?: 'online' | 'away' | 'busy';
}

// 存储所有连接的客户端
const connectedClients = new Map<string, ClientInfo>();
// 存储每个房间的在线用户
const roomOnlineUsers = new Map<number, Set<number>>();

export const initChatSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('用户连接:', socket.id);

    // 用户加入房间
    socket.on('join_chat_room', async (data: { roomId: number; userId: number; username: string; nickname?: string }) => {
      try {
        console.log('用户尝试加入房间:', data);
        // 验证用户权限
        const room = await ChatRoom.findByPk(data.roomId);
        if (!room) {
          console.log('房间不存在:', data.roomId);
          socket.emit('error', { message: '房间不存在' });
          return;
        }
        console.log('找到房间:', room.toJSON());

        // 加入房间
        socket.join(`chat_${data.roomId}`);
        
        // 记录客户端信息
        connectedClients.set(socket.id, {
          userId: data.userId,
          username: data.username,
          nickname: data.nickname,
          roomId: data.roomId,
          joinTime: new Date(),
          status: 'online'
        });

        // 更新房间在线用户列表
        if (!roomOnlineUsers.has(data.roomId)) {
          roomOnlineUsers.set(data.roomId, new Set());
        }
        roomOnlineUsers.get(data.roomId)!.add(data.userId);

        // 通知其他用户
        socket.to(`chat_${data.roomId}`).emit('user_joined', {
          userId: data.userId,
          username: data.username,
          message: `${data.username} 加入了聊天`
        });

        // 发送历史消息（最近10条，默认不显示太多）
        console.log('开始查询房间历史消息:', data.roomId);
        const recentMessages = await ChatMessage.findAll({
          where: { room_id: data.roomId },
          include: [{
            model: User,
            attributes: ['id', 'username', 'nickname']
          }],
          order: [['created_at', 'DESC']],
          limit: 10  // 只发送最近10条，用户点击加载更多再获取更早的
        });
        
        console.log(`查询到 ${recentMessages.length} 条历史消息`);
        
        // 处理消息数据，确保包含正确的用户名
        const processedMessages = recentMessages.map(msg => {
          const msgJson: any = msg.toJSON();
          // 通过关联获取用户信息
          const user = msgJson.User; // 注意：Sequelize关联查询返回的字段名是User（首字母大写）
          console.log('实时服务处理消息:', { msgJson, user });
          const processedMsg = {
            ...msgJson,
            username: user?.username || `用户${msgJson.user_id}`,
            nickname: user?.nickname || null,
            created_at: msgJson.createdAt || msgJson.created_at
          };
          console.log('处理消息:', {
            id: msgJson.id,
            content: msgJson.content.substring(0, 50) + '...',
            username: processedMsg.username,
            createdAt: msgJson.created_at
          });
          return processedMsg;
        });
        
        const reversedMessages = processedMessages.reverse();
        console.log(`发送 ${reversedMessages.length} 条历史消息给客户端`);
        socket.emit('chat_history', reversedMessages);

      } catch (error) {
        socket.emit('error', { message: '加入房间失败' });
      }
    });

    // 发送消息
    socket.on('send_chat_message', async (data: { 
      roomId: number; 
      content: string; 
      messageType?: string;
      file_name?: string;
      file_size?: number;
      file_url?: string;
    }) => {
      try {
        const clientInfo = connectedClients.get(socket.id);
        if (!clientInfo) return;

        console.log('收到聊天消息:', {
          roomId: data.roomId,
          content: data.content?.substring(0, 50) + '...',
          messageType: data.messageType,
          file_name: data.file_name,
          file_size: data.file_size,
          file_url: data.file_url
        });

        // 保存消息到数据库
        const message = await ChatMessage.create({
          room_id: data.roomId,
          user_id: clientInfo.userId,
          content: data.content,
          message_type: data.messageType || 'text'
        });

        // 广播给房间内所有用户
        // 包含前端发送的文件信息
        const messageData = {
          ...message.toJSON(),
          username: clientInfo.nickname || clientInfo.username,
          user_id: clientInfo.userId,
          created_at: new Date().toISOString(),
          // 添加文件相关字段（从前端传入的数据中获取）
          file_name: data.file_name,
          file_size: data.file_size,
          file_url: data.file_url
        };
        
        console.log('广播消息:', {
          id: messageData.id,
          messageType: messageData.message_type,
          file_name: messageData.file_name,
          file_url: messageData.file_url
        });
        
        io.to(`chat_${data.roomId}`).emit('receive_chat_message', messageData);

      } catch (error) {
        console.error('发送消息失败:', error);
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 用户离开房间
    socket.on('leave_chat_room', (data: { roomId: number }) => {
      try {
        const clientInfo = connectedClients.get(socket.id);
        if (!clientInfo) return;
        
        console.log('用户离开房间:', { userId: clientInfo.userId, username: clientInfo.username, roomId: data.roomId });
        
        // 从房间在线用户列表中移除
        const roomUsers = roomOnlineUsers.get(data.roomId);
        if (roomUsers) {
          roomUsers.delete(clientInfo.userId);
          // 如果房间没人了，清理房间记录
          if (roomUsers.size === 0) {
            roomOnlineUsers.delete(data.roomId);
          }
        }
        
        // 通知其他用户
        socket.to(`chat_${data.roomId}`).emit('user_left', {
          userId: clientInfo.userId,
          username: clientInfo.username,
          message: `${clientInfo.username} 离开了聊天`
        });
        
        // 离开Socket房间
        socket.leave(`chat_${data.roomId}`);
        
        console.log('用户已离开房间:', data.roomId);
      } catch (error) {
        console.error('离开房间失败:', error);
      }
    });

    // 断开连接处理
    socket.on('disconnect', () => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        // 从房间在线用户列表中移除
        const roomUsers = roomOnlineUsers.get(clientInfo.roomId);
        if (roomUsers) {
          roomUsers.delete(clientInfo.userId);
          // 如果房间没人了，清理房间记录
          if (roomUsers.size === 0) {
            roomOnlineUsers.delete(clientInfo.roomId);
          }
        }
        
        socket.to(`chat_${clientInfo.roomId}`).emit('user_left', {
          userId: clientInfo.userId,
          username: clientInfo.username,
          message: `${clientInfo.username} 离开了聊天`
        });
        connectedClients.delete(socket.id);
      }
      console.log('用户断开:', socket.id);
    });

    // 发送系统消息
    socket.on('send_system_message', async (data: { roomId: number; message: string }) => {
      try {
        console.log('收到系统消息请求:', data);
        
        // 保存系统消息到数据库
        const systemMessage = await ChatMessage.create({
          room_id: data.roomId,
          user_id: 0, // 系统消息用户ID设为0
          content: data.message,
          message_type: 'system'
        });
        
        console.log('系统消息保存成功:', systemMessage.toJSON());

        // 广播系统消息给房间内所有用户
        io.to(`chat_${data.roomId}`).emit('receive_chat_message', {
          ...systemMessage.toJSON(),
          username: '系统',
          user_id: 0,
          created_at: new Date().toISOString()
        });
        
        console.log('系统消息已广播到房间:', `chat_${data.roomId}`);
      } catch (error) {
        console.error('发送系统消息失败:', error);
      }
    });

    // 获取房间在线用户
    socket.on('get_online_users', (data: { roomId: number }) => {
      const roomUsers = roomOnlineUsers.get(data.roomId);
      if (roomUsers) {
        const onlineUserInfo = Array.from(roomUsers).map(userId => {
          for (const [socketId, clientInfo] of connectedClients) {
            if (clientInfo.userId === userId && clientInfo.roomId === data.roomId) {
              return {
                userId: clientInfo.userId,
                username: clientInfo.username,
                joinTime: clientInfo.joinTime,
                status: clientInfo.status || 'online'
              };
            }
          }
          return null;
        }).filter(Boolean);
        
        socket.emit('online_users_list', onlineUserInfo);
      } else {
        socket.emit('online_users_list', []);
      }
    });

    // 更新用户状态
    socket.on('update_user_status', (data: { roomId: number; userId: number; status: 'online' | 'away' | 'busy' }) => {
      console.log('收到用户状态更新:', data);
      
      for (const [socketId, clientInfo] of connectedClients) {
        if (clientInfo.userId === data.userId && clientInfo.roomId === data.roomId) {
          // 更新状态
          connectedClients.set(socketId, {
            ...clientInfo,
            status: data.status
          });
          
          console.log(`用户 ${clientInfo.username} 状态更新为: ${data.status}`);
          
          // 广播状态变化给房间内其他用户
          socket.to(`chat_${data.roomId}`).emit('user_status_changed', {
            userId: data.userId,
            username: clientInfo.username,
            status: data.status
          });
          
          // 确认给发送者
          socket.emit('status_updated', {
            userId: data.userId,
            status: data.status,
            success: true
          });
          
          break;
        }
      }
    });
  });
};


