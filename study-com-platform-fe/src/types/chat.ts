export interface ChatRoom {
  id: number;
  name: string;
  type: 'public' | 'private' | 'study_group';
  max_users: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  user_id: number;
  content: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  username?: string;
  nickname?: string;
}

export interface OnlineUser {
  userId: number;
  username: string;
  isOnline: boolean;
}

export interface AvailableUser {
  id: number;
  username: string;
  nickname?: string;
}

// 明确导出所有类型
export type { ChatRoom, ChatMessage, OnlineUser, AvailableUser };