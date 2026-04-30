import { api } from './api';

export type NotificationType = 'reservation_start' | 'reservation_renewal' | 'chat_message' | 'system';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  notification_type: NotificationType;
  reservation_id: number | null;
  chat_room_id: number | null;
  is_read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  StudyRoom?: {
    id: number;
    name: string;
    location: string;
    capacity: number;
  };
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const getUserNotifications = async (
  limit: number = 20,
  includeRead: boolean = false
): Promise<NotificationsResponse> => {
  const response = await api.get('/notifications', {
    params: { limit, includeRead }
  });
  return response.data.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await api.get('/notifications/unread-count');
  return response.data.data;
};

export const markAsRead = async (notificationId: number): Promise<void> => {
  const response = await api.post(`/notifications/${notificationId}/mark-read`);
  return response.data;
};

export const markAllAsRead = async (): Promise<{ markedCount: number }> => {
  const response = await api.post('/notifications/mark-all-read');
  return response.data.data;
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};
