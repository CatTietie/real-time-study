import { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types/chat';
import { API_BASE } from '../services/api';

interface UseChatSocketProps {
  roomId: number;
  userId: number;
  username: string;
}

export const useChatSocket = ({ roomId, userId, username }: UseChatSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // 使用useRef存储最新的用户信息
  const userInfoRef = useRef({ roomId, userId, username });
  
  // 只有当用户信息有效时才更新ref
  if (userId > 0 && username) {
    userInfoRef.current = { roomId, userId, username };
  }
  
  // 调试信息 - 只在用户信息有效时显示
  if (userId > 0 && username) {
    console.log('useChatSocket 接收到的有效参数:', { roomId, userId, username });
  }

  useEffect(() => {
    // 创建Socket连接
    const newSocket = io(API_BASE.replace('/api', ''), {
      transports: ['websocket'],
      withCredentials: true
    });

    setTimeout(() => {
      setSocket(newSocket);
    }, 0);

    // 连接成功
    newSocket.on('connect', () => {
      console.log('聊天Socket连接成功');
      
      // 使用最新的用户信息
      const { roomId: currentRoomId, userId: currentUserId, username: currentUsername } = userInfoRef.current;
      console.log('准备加入房间，参数:', { roomId: currentRoomId, userId: currentUserId, username: currentUsername });
      
      // 验证用户信息
      if (!currentUserId || !currentUsername) {
        console.error('用户信息不完整，无法加入房间:', { userId: currentUserId, username: currentUsername });
        return;
      }
      
      setIsConnected(true);
      
      // 加入聊天房间
      newSocket.emit('join_chat_room', { 
        roomId: currentRoomId, 
        userId: currentUserId, 
        username: currentUsername 
      });
    });

    // 收到历史消息
    newSocket.on('chat_history', (historyMessages: ChatMessage[]) => {
      setMessages(historyMessages);
    });

    // 收到新消息
    newSocket.on('receive_chat_message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // 用户加入
    newSocket.on('user_joined', (data: { username: string }) => {
      // 可以在这里更新在线用户列表
      console.log(`${data.username} 加入了聊天`);
    });

    // 用户离开
    newSocket.on('user_left', (data: { username: string }) => {
      console.log(`${data.username} 离开了聊天`);
    });

    // 错误处理
    newSocket.on('error', (error: { message: string }) => {
      console.error('聊天错误:', error.message);
    });

    // 断开连接
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('聊天Socket断开连接');
    });

    return () => {
      console.log('清理Socket连接');
      newSocket.close();
    };
  }, []); // 移除依赖项，只在组件挂载时初始化一次

  // 发送普通消息
  const sendMessage = useCallback((content: string, messageType: string = 'text') => {
    if (socket && isConnected) {
      socket.emit('send_chat_message', {
        roomId,
        content,
        messageType
      });
    }
  }, [socket, isConnected, roomId]);

  // 发送系统消息
  const sendSystemMessage = useCallback((message: string) => {
    if (socket && isConnected) {
      socket.emit('send_system_message', {
        roomId,
        message
      });
    }
  }, [socket, isConnected, roomId]);

  return {
    socket,
    messages,
    isConnected,
    sendMessage,
    sendSystemMessage
  };
};