import { api } from './api';

// 获取用户列表
export const fetchUsers = async (params: any = {}) => {
  const response = await api.get('/user-management', { params });
  return response.data;
};

// 获取用户详情
export const fetchUserDetail = async (id: number) => {
  const response = await api.get(`/user-management/${id}`);
  return response.data;
};

// 创建用户
export const createUser = async (userData: any) => {
  const response = await api.post('/user-management', userData);
  return response.data;
};

// 更新用户信息
export const updateUser = async (id: number, userData: any) => {
  const response = await api.put(`/user-management/${id}`, userData);
  return response.data;
};

// 删除用户
export const deleteUser = async (id: number) => {
  const response = await api.delete(`/user-management/${id}`);
  return response.data;
};

// 批量更新用户
export const batchUpdateUsers = async (userIds: number[], action: string, value: any) => {
  const response = await api.post('/user-management/batch', { userIds, action, value });
  return response.data;
};

// 更新用户密码
export const updateUserPassword = async (id: number, passwords: { oldPassword: string; newPassword: string }) => {
  const response = await api.put(`/user-management/${id}/password`, passwords);
  return response.data;
};