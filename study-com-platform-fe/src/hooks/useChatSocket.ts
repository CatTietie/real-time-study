import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import type { ChatMessage, OnlineUser } from '../types/chat';
import { API_BASE } from '../services/api';

interface UseChatSocketProps {
  roomId: number;
  userId: number;
  username: string;
}

export const useChatSocket = ({ roomId, userId, username }: UseChatSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 创建Socket连接
    const newSocket = io(API_BASE.replace('/api', ''), {
      transports: ['websocket'],
      withCredentials: true
    });

    setSocket(newSocket);

    // 连接成功
    newSocket.on('connect', () => {
      console.log('聊天Socket连接成功');
      setIsConnected(true);
      
      // 加入聊天房间
      newSocket.emit('join_chat_room', { roomId, userId, username });
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
      newSocket.close();
    };
  }, [roomId, userId, username]);

  // 发送消息
  const sendMessage = useCallback((content: string, messageType: string = 'text') => {
    if (socket && isConnected) {
      socket.emit('send_chat_message', {
        roomId,
        content,
        messageType
      });
    }
  }, [socket, isConnected, roomId]);

  return {
    messages,
    onlineUsers,
    isConnected,
    sendMessage
  };
};