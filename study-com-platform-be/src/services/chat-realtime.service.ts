import { Server, Socket } from 'socket.io';
import ChatMessage from '../models/chat-message.model';
import ChatRoom from '../models/chat-room.model';

interface ClientInfo {
  userId: number;
  username: string;
  roomId: number;
}

const connectedClients = new Map<string, ClientInfo>();

export const initChatSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('用户连接:', socket.id);

    // 用户加入房间
    socket.on('join_chat_room', async (data: { roomId: number; userId: number; username: string }) => {
      try {
        // 验证用户权限
        const room = await ChatRoom.findByPk(data.roomId);
        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        // 加入房间
        socket.join(`chat_${data.roomId}`);
        
        // 记录客户端信息
        connectedClients.set(socket.id, {
          userId: data.userId,
          username: data.username,
          roomId: data.roomId
        });

        // 通知其他用户
        socket.to(`chat_${data.roomId}`).emit('user_joined', {
          userId: data.userId,
          username: data.username,
          message: `${data.username} 加入了聊天`
        });

        // 发送历史消息（最近50条）
        const recentMessages = await ChatMessage.findAll({
          where: { room_id: data.roomId },
          order: [['created_at', 'DESC']],
          limit: 50
        });
        
        socket.emit('chat_history', recentMessages.reverse());

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
        io.to(`chat_${data.roomId}`).emit('receive_chat_message', {
          ...message.toJSON(),
          username: clientInfo.username
        });

      } catch (error) {
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 断开连接处理
    socket.on('disconnect', () => {
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        socket.to(`chat_${clientInfo.roomId}`).emit('user_left', {
          userId: clientInfo.userId,
          username: clientInfo.username,
          message: `${clientInfo.username} 离开了聊天`
        });
        connectedClients.delete(socket.id);
      }
      console.log('用户断开:', socket.id);
    });
  });
};
