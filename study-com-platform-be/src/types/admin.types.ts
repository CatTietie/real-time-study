// 管理员相关的类型定义
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  role: string;
  token: string;
  expiresIn: string;
}

export interface AdminProfile {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  role: string;
  points: number;
  status: number;
  last_login?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAdminRequest {
  nickname?: string;
  avatar?: string;
}

export interface AdminLogEntry {
  id: number;
  admin_id: number;
  action_type: string;
  target_table?: string;
  target_id?: number;
  detail?: string;
  ip_address?: string;
  created_at: Date;
}

export interface AdminLogQuery {
  page?: number;
  pageSize?: number;
  adminId?: number;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminLogResponse {
  data: AdminLogEntry[];
  pagination: Pagination;
}

export interface TokenPayload {
  id: number;
  username: string;
  role: string;
}
