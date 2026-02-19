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