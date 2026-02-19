import { api } from './api';
import type { ChatRoom, ChatMessage } from '../types/chat';

// 创建聊天室
export const createChatRoom = async (roomData: {
  name: string;
  type?: 'public' | 'private' | 'study_group';
  maxUsers?: number;
}): Promise<ChatRoom> => {
  const response = await api.post('/chat/rooms', roomData);
  return response.data.data;
};

// 获取聊天室列表
export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const response = await api.get('/chat/rooms');
  return response.data.data;
};

// 获取聊天消息
export const getChatMessages = async (
  roomId: number,
  page: number = 1,
  pageSize: number = 50
): Promise<{
  messages: ChatMessage[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}> => {
  const response = await api.get(`/chat/messages/${roomId}`, {
    params: { page, pageSize }
  });
  return {
    messages: response.data.data,
    pagination: response.data.pagination
  };
};