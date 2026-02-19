import { Server, Socket } from 'socket.io';
import Whiteboard from '../models/whiteboard.model';
import WhiteboardAction from '../models/whiteboard-action.model';
import ChatRoom from '../models/chat-room.model';

interface WhiteboardClient {
  userId: number;
  username: string;
  cursorX: number;
  cursorY: number;
}

const whiteboardClients = new Map<number, Map<string, WhiteboardClient>>();

export const initWhiteboardSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    
    // 加入白板房间
    socket.on('join_whiteboard', async (data: { 
      whiteboardId: number; 
      userId: number; 
      username: string 
    }) => {
      try {
        socket.join(`whiteboard_${data.whiteboardId}`);
        
        // 初始化客户端列表
        if (!whiteboardClients.has(data.whiteboardId)) {
          whiteboardClients.set(data.whiteboardId, new Map());
        }
        
        const clients = whiteboardClients.get(data.whiteboardId)!;
        clients.set(socket.id, {
          userId: data.userId,
          username: data.username,
          cursorX: 0,
          cursorY: 0
        });

        // 通知其他用户有新用户加入
        socket.to(`whiteboard_${data.whiteboardId}`).emit('user_joined_whiteboard', {
          userId: data.userId,
          username: data.username
        });

        // 发送当前白板状态给新用户
        const whiteboard = await Whiteboard.findByPk(data.whiteboardId);
        if (whiteboard) {
          socket.emit('whiteboard_state', whiteboard);
        }

      } catch (error) {
        socket.emit('error', { message: '加入白板失败' });
      }
    });

    // 白板操作同步
    socket.on('whiteboard_action', async (data: {
      whiteboardId: number;
      actionType: 'draw' | 'erase' | 'text' | 'shape' | 'image' | 'clear' | 'undo' | 'redo';
      actionData: any;
    }) => {
      try {
        const clientInfo = whiteboardClients.get(data.whiteboardId)?.get(socket.id);
        if (!clientInfo) return;

        // 保存操作记录
        await WhiteboardAction.create({
          whiteboard_id: data.whiteboardId,
          user_id: clientInfo.userId,
          action_type: data.actionType,
          data: JSON.stringify(data.actionData)
        });

        // 获取白板信息以获取关联的聊天室
        const whiteboard = await Whiteboard.findByPk(data.whiteboardId);
        if (whiteboard) {
          // 同时向聊天室广播白板活动
          const chatMessage = `用户 ${clientInfo.username} 在白板上进行了 ${data.actionType} 操作`;
          socket.to(`chat_${whiteboard.room_id}`).emit('system_message', {
            type: 'whiteboard_activity',
            content: chatMessage,
            sender: clientInfo.username,
            whiteboardId: data.whiteboardId,
            actionType: data.actionType
          });
        }

        // 广播操作给其他白板用户
        socket.to(`whiteboard_${data.whiteboardId}`).emit('whiteboard_update', {
          userId: clientInfo.userId,
          username: clientInfo.username,
          actionType: data.actionType,
          actionData: data.actionData
        });

      } catch (error) {
        socket.emit('error', { message: '白板操作失败' });
      }
    });

    // 光标位置更新
    socket.on('cursor_move', (data: {
      whiteboardId: number;
      x: number;
      y: number;
    }) => {
      const clients = whiteboardClients.get(data.whiteboardId);
      if (clients && clients.has(socket.id)) {
        const client = clients.get(socket.id)!;
        client.cursorX = data.x;
        client.cursorY = data.y;
        
        // 广播光标位置
        socket.to(`whiteboard_${data.whiteboardId}`).emit('cursor_update', {
          userId: client.userId,
          username: client.username,
          x: data.x,
          y: data.y
        });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      // 从所有白板中移除该用户
      whiteboardClients.forEach((clients, whiteboardId) => {
        if (clients.has(socket.id)) {
          const client = clients.get(socket.id)!;
          socket.to(`whiteboard_${whiteboardId}`).emit('user_left_whiteboard', {
            userId: client.userId,
            username: client.username
          });
          clients.delete(socket.id);
        }
      });
    });
  });
};
