import { api } from './api';
import type { WhiteboardState } from '../types/whiteboard';

// 创建白板
export const createWhiteboard = async (whiteboardData: {
  roomId: number;
  name?: string;
  type?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
}): Promise<WhiteboardState> => {
  const response = await api.post('/whiteboard', whiteboardData);
  return response.data.data;
};

// 获取白板信息
export const getWhiteboard = async (id: number): Promise<WhiteboardState> => {
  const response = await api.get(`/whiteboard/${id}`);
  return response.data.data;
};

// 获取白板操作记录
export const getWhiteboardActions = async (
  whiteboardId: number,
  page: number = 1,
  pageSize: number = 100
): Promise<{
  actions: any[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}> => {
  const response = await api.get(`/whiteboard/actions/${whiteboardId}`, {
    params: { page, pageSize }
  });
  return {
    actions: response.data.data,
    pagination: response.data.pagination
  };
};

// 清空白板
export const clearWhiteboard = async (whiteboardId: number): Promise<void> => {
  await api.post(`/whiteboard/clear/${whiteboardId}`);
};

// 导出白板为PNG
export const exportWhiteboardToPng = async (whiteboardId: number): Promise<any> => {
  const response = await api.get(`/whiteboard/export/${whiteboardId}`);
  return response.data.data;
};

// 保存白板快照
export const saveWhiteboardSnapshot = async (
  whiteboardId: number,
  snapshot: unknown,
  name?: string
): Promise<any> => {
  const response = await api.post(`/whiteboard/snapshot/${whiteboardId}`, {
    snapshot,
    name
  });
  return response.data;
};

// 获取白板快照列表
export const getWhiteboardSnapshots = async (whiteboardId: number): Promise<any[]> => {
  const response = await api.get(`/whiteboard/snapshots/${whiteboardId}`);
  return response.data.data;
};

// 加载白板快照
export const loadWhiteboardSnapshot = async (snapshotId: number): Promise<any> => {
  const response = await api.get(`/whiteboard/snapshot/load/${snapshotId}`);
  return response.data.data;
};

// 获取聊天室白板快照列表
export const getChatRoomWhiteboardSnapshots = async (roomId: number): Promise<any> => {
  const response = await api.get(`/whiteboard/chat-room/${roomId}/snapshots`);
  return response.data.data;
};