import { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types/chat';
import { API_BASE } from '../services/api';
import { getChatHistory } from '../services/chat';

// 新消息声音提示
const playMessageSound = () => {
  try {
    // 使用 Web Audio API 生成简单的提示音
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 设置频率和音量
    oscillator.frequency.value = 800; // 800Hz 频率
    oscillator.type = 'sine'; // 正弦波
    
    // 音量包络（淡入淡出）
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    // 播放
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
    
  } catch (error) {
    console.log('播放消息提示音失败:', error);
  }
};

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
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [currentMonthMessageCount, setCurrentMonthMessageCount] = useState(0);
  const [collapsedMessageCount, setCollapsedMessageCount] = useState(0);
  const [isAllHistoryLoaded, setIsAllHistoryLoaded] = useState(false);
  
  const earliestMessageIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const userInfoRef = useRef({ roomId, userId, username, nickname });
  
  if (userId > 0 && username) {
    userInfoRef.current = { roomId, userId, username, nickname };
  }
  
  if (userId > 0 && username) {
    console.log('useChatSocket 接收到的有效参数:', { roomId, userId, username, nickname });
  }

  const getCurrentMonthRange = useCallback(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      startTime: firstDay.toISOString(),
      endTime: lastDay.toISOString()
    };
  }, []);

  const setAllMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  }, []);

  const prependMessages = useCallback((oldMessages: ChatMessage[]) => {
    setMessages(prev => [...oldMessages, ...prev]);
  }, []);

  const loadCurrentMonthMessages = useCallback(async () => {
    const { startTime, endTime } = getCurrentMonthRange();
    console.log('加载本月消息:', { startTime, endTime });
    
    setLoadingHistory(true);
    try {
      const result = await getChatHistory(roomId, 1, 100, undefined, startTime, endTime);
      console.log('本月消息结果:', {
        count: result.messages.length,
        total: result.pagination.total
      });
      
      const sortedMessages = [...result.messages].sort((a, b) => {
        const aDate = new Date(a.created_at || a.createdAt || 0);
        const bDate = new Date(b.created_at || b.createdAt || 0);
        return aDate.getTime() - bDate.getTime();
      });
      
      setMessages(sortedMessages);
      setCurrentMonthMessageCount(result.pagination.total);
      
      if (sortedMessages.length > 0) {
        earliestMessageIdRef.current = sortedMessages[0].id || null;
      }
      
      const totalResult = await getChatHistory(roomId, 1, 1);
      setTotalMessageCount(totalResult.pagination.total);
      
      const collapsed = totalResult.pagination.total - result.pagination.total;
      setCollapsedMessageCount(Math.max(0, collapsed));
      setHasMoreHistory(collapsed > 0);
      setIsAllHistoryLoaded(false);
      
    } catch (error) {
      console.error('加载本月消息失败:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [roomId, getCurrentMonthRange]);

  const loadAllMessages = useCallback(async () => {
    console.log('加载所有消息（不带时间范围）');
    
    setLoadingHistory(true);
    try {
      const result = await getChatHistory(roomId, 1, 1000);
      console.log('所有消息结果:', {
        count: result.messages.length,
        total: result.pagination.total
      });
      
      const sortedMessages = [...result.messages].sort((a, b) => {
        const aDate = new Date(a.created_at || a.createdAt || 0);
        const bDate = new Date(b.created_at || b.createdAt || 0);
        return aDate.getTime() - bDate.getTime();
      });
      
      setMessages(sortedMessages);
      setTotalMessageCount(result.pagination.total);
      setCollapsedMessageCount(0);
      setHasMoreHistory(false);
      setIsAllHistoryLoaded(true);
      
      if (sortedMessages.length > 0) {
        earliestMessageIdRef.current = sortedMessages[0].id || null;
      }
      
    } catch (error) {
      console.error('加载所有消息失败:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [roomId]);

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
      console.log('📥 收到socket历史消息（忽略，使用API按时间范围查询）:', historyMessages.length, '条');
      // 忽略 socket 发送的历史消息，改用 API 按时间范围查询
    });

    newSocket.on('receive_chat_message', (message: ChatMessage) => {
      console.log('收到新消息:', message);
      setMessages(prev => [...prev, message]);
      
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      setTotalMessageCount(prev => prev + 1);
      
      // 新消息声音提醒
      // 只在收到他人的消息时播放声音，系统消息和自己的消息不播放
      const currentUserId = userInfoRef.current.userId;
      const isSystemMessage = message.message_type === 'system';
      const isOwnMessage = message.user_id === currentUserId;
      
      if (!isSystemMessage && !isOwnMessage) {
        playMessageSound();
      }
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
      earliestMessageIdRef.current = null;
      setHasMoreHistory(false);
      setTotalMessageCount(0);
      setCurrentMonthMessageCount(0);
      setCollapsedMessageCount(0);
      setIsAllHistoryLoaded(false);
      
      console.log('加入新房间:', roomId);
      socket.emit('join_chat_room', { 
        roomId, 
        userId, 
        username,
        nickname
      });
      
      loadCurrentMonthMessages();
    }
  }, [roomId, socket, isConnected, userId, username, nickname, loadCurrentMonthMessages]);

  useEffect(() => {
    if (socket && isConnected && roomId > 0 && userId > 0) {
      loadCurrentMonthMessages();
    }
  }, [socket, isConnected, roomId, userId, loadCurrentMonthMessages]);

  const loadMoreHistory = useCallback(async () => {
    if (loadingHistory) {
      console.log('跳过加载历史消息: loadingHistory = true');
      return;
    }

    if (isAllHistoryLoaded) {
      console.log('已经加载了所有消息');
      return;
    }

    if (collapsedMessageCount > 0) {
      console.log('有被折叠的消息，点击加载所有消息');
      await loadAllMessages();
      return;
    }

    console.log('开始加载历史消息，earliestMessageId:', earliestMessageIdRef.current);
    setLoadingHistory(true);

    try {
      const result = await getChatHistory(
        roomId, 
        1, 
        50, 
        earliestMessageIdRef.current || undefined
      );
      console.log('加载历史消息结果:', {
        count: result.messages.length,
        total: result.pagination.total,
        beforeId: earliestMessageIdRef.current
      });
      
      if (result.messages.length > 0) {
        const sortedNewMessages = [...result.messages].sort((a, b) => {
          const aDate = new Date(a.created_at || a.createdAt || 0);
          const bDate = new Date(b.created_at || b.createdAt || 0);
          return aDate.getTime() - bDate.getTime();
        });
        
        earliestMessageIdRef.current = sortedNewMessages[0].id || null;
        setHasMoreHistory(result.messages.length >= 50);
        
        setMessages(prev => {
          const newMessages = [...sortedNewMessages, ...prev];
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
        
      } else {
        setHasMoreHistory(false);
        console.log('没有更多消息，设置 hasMoreHistory = false');
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
      setHasMoreHistory(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [roomId, loadingHistory, isAllHistoryLoaded, collapsedMessageCount, loadAllMessages]);

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
    currentMonthMessageCount,
    collapsedMessageCount,
    isAllHistoryLoaded,
    loadMoreHistory,
    loadAllMessages,
    loadCurrentMonthMessages,
    setAllMessages,
    prependMessages,
    messagesEndRef,
    sendMessage,
    sendSystemMessage
  };
};
