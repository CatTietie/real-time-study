import { api } from './api';
import type { ChatRoom, ChatMessage, AvailableUser } from '../types/chat';

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

// 删除聊天室
export const deleteChatRoom = async (roomId: number): Promise<void> => {
  const response = await api.delete(`/chat/rooms/${roomId}`);
  return response.data;
};

// 退出聊天室
export const leaveChatRoom = async (roomId: number): Promise<void> => {
  const response = await api.post(`/chat/rooms/${roomId}/leave`);
  return response.data;
};

// 直接拉用户进入聊天室
export const addUserToRoom = async (roomId: number, userId: number): Promise<any> => {
  const response = await api.post(`/chat/rooms/${roomId}/add-user`, { userId });
  return response.data;
};

// 获取可邀请的用户列表
export const getAvailableUsers = async (roomId: number): Promise<any[]> => {
  const response = await api.get(`/chat/available-users/${roomId}`);
  return response.data.data;
};

// 获取聊天室历史消息（分页）
export const getChatHistory = async (
  roomId: number,
  page: number = 1,
  limit: number = 50,
  beforeId?: number,
  startTime?: string,
  endTime?: string
): Promise<{
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}> => {
  const params: any = { page, limit };
  if (beforeId) {
    params.beforeId = beforeId;
  }
  if (startTime) {
    params.startTime = startTime;
  }
  if (endTime) {
    params.endTime = endTime;
  }
  
  const response = await api.get(`/chat/history/${roomId}`, { params });
  return response.data.data;
};

// 搜索聊天室消息
export const searchChatMessages = async (
  roomId: number,
  keyword: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  keyword: string;
}> => {
  const response = await api.get(`/chat/search/${roomId}`, {
    params: { keyword, page, limit }
  });
  return response.data.data;
};

// 上传聊天文件/图片
export const uploadChatFile = async (file: File): Promise<{
  file_name: string;
  file_url: string;
  file_size: number;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/chat/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};