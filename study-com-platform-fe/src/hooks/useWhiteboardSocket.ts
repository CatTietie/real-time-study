import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import type { WhiteboardAction, WhiteboardState } from '../types/whiteboard';
import { API_BASE } from '../services/api';

interface UseWhiteboardSocketProps {
  whiteboardId: number;
  userId: number;
  username: string;
  roomId?: number; // 关联的聊天室ID
}

export const useWhiteboardSocket = ({ 
  whiteboardId, 
  userId, 
  username,
  roomId
}: UseWhiteboardSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [actions, setActions] = useState<WhiteboardAction[]>([]);
  const [currentState, setCurrentState] = useState<WhiteboardState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [otherUsers, setOtherUsers] = useState<Array<{userId: number; username: string}>>([]);

  useEffect(() => {
    const newSocket = io(API_BASE.replace('/api', ''), {
      transports: ['websocket'],
      withCredentials: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('📤 发送加入白板请求:', { whiteboardId, userId, username, roomId });
      newSocket.emit('join_whiteboard', { whiteboardId, userId, username, roomId });
    });

    // 接收白板状态
    newSocket.on('whiteboard_state', (state: WhiteboardState) => {
      setCurrentState(state);
    });

    // 接收白板更新
    newSocket.on('whiteboard_update', (action: WhiteboardAction) => {
      console.log('📥 接收到白板更新:', {
        actionType: action.type,
        userId: action.userId,
        username: action.username,
        dataPreview: action.data ? JSON.stringify(action.data).substring(0, 100) + '...' : 'null',
        timestamp: new Date().toISOString()
      });
      setActions(prev => [...prev, action]);
    });

    // 用户加入
    newSocket.on('user_joined_whiteboard', (user: { userId: number; username: string }) => {
      setOtherUsers(prev => [...prev, user]);
    });

    // 用户离开
    newSocket.on('user_left_whiteboard', (user: { userId: number; username: string }) => {
      setOtherUsers(prev => prev.filter(u => u.userId !== user.userId));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [whiteboardId, userId, username, roomId]);

  // 发送白板操作
  const sendAction = useCallback((action: Omit<WhiteboardAction, 'userId' | 'username'>) => {
    if (socket && isConnected) {
      const fullAction = {
        ...action,
        userId,
        username
      };
      socket.emit('whiteboard_action', {
        whiteboardId,
        actionType: action.type,
        actionData: action
      });
    }
  }, [socket, isConnected, whiteboardId, userId, username]);

  return {
    actions,
    currentState,
    isConnected,
    otherUsers,
    sendAction
  };
};