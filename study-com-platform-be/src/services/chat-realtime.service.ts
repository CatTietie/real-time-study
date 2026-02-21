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
          joinTime: new Date()
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

        // 发送历史消息（最近50条）
        console.log('开始查询房间历史消息:', data.roomId);
        const recentMessages = await ChatMessage.findAll({
          where: { room_id: data.roomId },
          include: [{
            model: User,
            attributes: ['id', 'username', 'nickname']
          }],
          order: [['created_at', 'DESC']],
          limit: 50
        });
        
        console.log(`查询到 ${recentMessages.length} 条历史消息`);
        
        // 处理消息数据，确保包含正确的用户名
        const processedMessages = recentMessages.map(msg => {
          const msgJson: any = msg.toJSON();
          // 通过关联获取用户信息
          const user = (msg as any).user;
          const processedMsg = {
            ...msgJson,
            username: user?.nickname || user?.username || `用户${msgJson.user_id}`
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
      messageType?: string 
    }) => {
      try {
        const clientInfo = connectedClients.get(socket.id);
        if (!clientInfo) return;

        // 保存消息到数据库
        const message = await ChatMessage.create({
          room_id: data.roomId,
          user_id: clientInfo.userId,
          content: data.content,
          message_type: data.messageType || 'text'
        });

        // 广播给房间内所有用户
        const messageData = {
          ...message.toJSON(),
          username: clientInfo.nickname || clientInfo.username,
          user_id: clientInfo.userId,
          created_at: new Date().toISOString()
        };
        
        io.to(`chat_${data.roomId}`).emit('receive_chat_message', messageData);

      } catch (error) {
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
        // 获取用户详细信息
        const onlineUserInfo = Array.from(roomUsers).map(userId => {
          // 查找该用户的连接信息
          for (const [socketId, clientInfo] of connectedClients) {
            if (clientInfo.userId === userId && clientInfo.roomId === data.roomId) {
              return {
                userId: clientInfo.userId,
                username: clientInfo.username,
                joinTime: clientInfo.joinTime
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
  });
};


