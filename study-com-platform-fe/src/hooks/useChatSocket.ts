import { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types/chat';
import { API_BASE } from '../services/api';
import { getChatHistory } from '../services/chat';

interface UseChatSocketProps {
  roomId: number;
  userId: number;
  username: string;
  nickname?: string;
}

export const useChatSocket = ({ roomId, userId, username, nickname }: UseChatSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  
  const currentPageRef = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const userInfoRef = useRef({ roomId, userId, username, nickname });
  
  if (userId > 0 && username) {
    userInfoRef.current = { roomId, userId, username, nickname };
  }
  
  if (userId > 0 && username) {
    console.log('useChatSocket 接收到的有效参数:', { roomId, userId, username, nickname });
  }

  const setAllMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  }, []);

  const prependMessages = useCallback((oldMessages: ChatMessage[]) => {
    setMessages(prev => [...oldMessages, ...prev]);
  }, []);

  useEffect(() => {
    const newSocket = io(API_BASE.replace('/api', ''), {
      transports: ['websocket'],
      withCredentials: true
    });

    setTimeout(() => {
      setSocket(newSocket);
    }, 0);

    newSocket.on('connect', () => {
      console.log('聊天Socket连接成功');
      
      const { roomId: currentRoomId, userId: currentUserId, username: currentUsername } = userInfoRef.current;
      console.log('准备加入房间，参数:', { roomId: currentRoomId, userId: currentUserId, username: currentUsername });
      
      if (!currentUserId || !currentUsername) {
        console.error('用户信息不完整，无法加入房间:', { userId: currentUserId, username: currentUsername });
        return;
      }
      
      setIsConnected(true);
      
      newSocket.emit('join_chat_room', { 
        roomId: currentRoomId, 
        userId: currentUserId, 
        username: currentUsername,
        nickname: userInfoRef.current.nickname
      });
    });

    newSocket.on('chat_history', (historyMessages: ChatMessage[]) => {
      console.log('📥 收到历史消息:', historyMessages.length, '条');
      setMessages(historyMessages);
      currentPageRef.current = 2;
      
      if (historyMessages.length > 0) {
        loadTotalMessageCount();
      }
    });

    newSocket.on('receive_chat_message', (message: ChatMessage) => {
      console.log('收到新消息:', message);
      setMessages(prev => [...prev, message]);
      
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    });

    newSocket.on('user_joined', (data: { username: string }) => {
      console.log(`${data.username} 加入了聊天`);
    });

    newSocket.on('user_left', (data: { username: string }) => {
      console.log(`${data.username} 离开了聊天`);
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('聊天错误:', error.message);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('聊天Socket断开连接');
    });

    return () => {
      console.log('清理Socket连接');
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket && isConnected && roomId && userId > 0 && username) {
      console.log('roomId变化，重新加入房间:', roomId);
      
      const currentRoomId = userInfoRef.current.roomId;
      if (currentRoomId && currentRoomId !== roomId) {
        console.log('离开当前房间:', currentRoomId);
        socket.emit('leave_chat_room', { roomId: currentRoomId });
      }
      
      userInfoRef.current = { roomId, userId, username, nickname };
      
      setMessages([]);
      currentPageRef.current = 1;
      setHasMoreHistory(true);
      setTotalMessageCount(0);
      
      console.log('加入新房间:', roomId);
      socket.emit('join_chat_room', { 
        roomId, 
        userId, 
        username,
        nickname
      });
    }
  }, [roomId, socket, isConnected, userId, username, nickname]);

  const loadTotalMessageCount = async () => {
    try {
      const result = await getChatHistory(roomId, 1, 1);
      setTotalMessageCount(result.pagination.total);
    } catch (error) {
      console.error('加载消息总数失败:', error);
    }
  };

  const loadMoreHistory = useCallback(async () => {
    if (loadingHistory || !hasMoreHistory) {
      console.log('跳过加载历史消息:', { loadingHistory, hasMoreHistory });
      return;
    }

    console.log('开始加载历史消息，页码:', currentPageRef.current);
    setLoadingHistory(true);

    try {
      const result = await getChatHistory(roomId, currentPageRef.current, 50);
      console.log('加载历史消息结果:', {
        count: result.messages.length,
        total: result.pagination.total,
        hasNext: result.pagination.hasNext
      });
      
      if (result.messages.length > 0) {
        const currentMessages = [...result.messages];
        
        setMessages(prev => {
          const newMessages = [...currentMessages, ...prev];
          const uniqueMessages = Array.from(
            new Map(newMessages.map(m => [m.id, m])).values()
          ).sort((a, b) => {
            const aDate = new Date(a.created_at || a.createdAt || 0);
            const bDate = new Date(b.created_at || b.createdAt || 0);
            return aDate.getTime() - bDate.getTime();
          });
          console.log('合并后消息数量:', uniqueMessages.length);
          return uniqueMessages;
        });
        
        currentPageRef.current += 1;
        setHasMoreHistory(result.pagination.hasNext);
        setTotalMessageCount(result.pagination.total);
        console.log('更新状态:', {
          nextPage: currentPageRef.current,
          hasMore: result.pagination.hasNext
        });
      } else {
        setHasMoreHistory(false);
        console.log('没有更多消息，设置 hasMoreHistory = false');
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [roomId, loadingHistory, hasMoreHistory]);

  const sendMessage = useCallback((
    content: string, 
    messageType: 'text' | 'image' | 'file' = 'text',
    extraData?: {
      file_name?: string;
      file_size?: number;
      file_url?: string;
    }
  ) => {
    if (socket && isConnected) {
      const messageData: any = {
        roomId,
        content,
        messageType
      };
      
      if (extraData) {
        if (extraData.file_name) messageData.file_name = extraData.file_name;
        if (extraData.file_size) messageData.file_size = extraData.file_size;
        if (extraData.file_url) messageData.file_url = extraData.file_url;
      }
      
      socket.emit('send_chat_message', messageData);
    }
  }, [socket, isConnected, roomId]);

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
    loadingHistory,
    hasMoreHistory,
    totalMessageCount,
    currentPage: currentPageRef.current,
    loadMoreHistory,
    setAllMessages,
    prependMessages,
    messagesEndRef,
    sendMessage,
    sendSystemMessage
  };
};
