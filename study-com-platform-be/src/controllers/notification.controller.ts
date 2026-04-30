import { Request, Response } from "express";
import Notification from "../models/notification.model";
import UnreadMessage from "../models/unread-message.model";
import { Op } from "sequelize";

interface MergedNotification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  notification_type: 'reservation_start' | 'reservation_renewal' | 'chat_message' | 'system';
  reservation_id: number | null;
  chat_room_id: number | null;
  is_read: boolean;
  metadata: any;
  created_at: Date | string;
  updated_at: Date | string;
  source: 'notification' | 'unread_message';
  unread_count?: number;
}

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { limit = 20, includeRead = false } = req.query as {
      limit?: string;
      includeRead?: string;
    };

    const limitNum = parseInt(limit as string) || 20;
    const includeReadBool = includeRead === 'true';

    const whereClause: any = {
      user_id: req.user.id
    };

    if (!includeReadBool) {
      whereClause.is_read = false;
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: limitNum
    });

    const unreadMessages = await UnreadMessage.findAll({
      where: {
        user_id: req.user.id,
        unread_count: { [Op.gt]: 0 }
      },
      include: [{
        association: 'ChatRoom',
        attributes: ['id', 'name', 'type']
      }],
      order: [['updated_at', 'DESC']]
    });

    const mergedNotifications: MergedNotification[] = [];

    for (const n of notifications) {
      const nJson: any = n.toJSON();
      mergedNotifications.push({
        id: nJson.id,
        user_id: nJson.user_id,
        title: nJson.title,
        content: nJson.content,
        notification_type: nJson.notification_type,
        reservation_id: nJson.reservation_id,
        chat_room_id: nJson.chat_room_id,
        is_read: nJson.is_read,
        metadata: nJson.metadata,
        created_at: nJson.created_at || new Date(),
        updated_at: nJson.updated_at || new Date(),
        source: 'notification'
      });
    }

    for (const um of unreadMessages) {
      const umJson: any = um.toJSON();
      const room = umJson.ChatRoom;
      mergedNotifications.push({
        id: umJson.id + 1000000,
        user_id: umJson.user_id,
        title: `新消息: ${umJson.last_sender_nickname || '有人'}`,
        content: umJson.last_message_content || '',
        notification_type: 'chat_message',
        reservation_id: null,
        chat_room_id: umJson.room_id,
        is_read: false,
        metadata: {
          message_type: umJson.last_message_type,
          sender_id: umJson.last_sender_id,
          sender_nickname: umJson.last_sender_nickname,
          room_name: room?.name || '未知房间',
          unread_count: umJson.unread_count
        },
        created_at: umJson.updated_at || new Date(),
        updated_at: umJson.updated_at || new Date(),
        source: 'unread_message',
        unread_count: umJson.unread_count
      });
    }

    mergedNotifications.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const finalNotifications = mergedNotifications.slice(0, limitNum);

    const notificationUnreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    const unreadMessageCount = await UnreadMessage.sum('unread_count', {
      where: {
        user_id: req.user.id
      }
    }) || 0;

    const totalUnreadCount = notificationUnreadCount + unreadMessageCount;

    res.json({
      success: true,
      data: {
        notifications: finalNotifications,
        unreadCount: totalUnreadCount,
        notificationUnreadCount,
        unreadMessageCount
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取通知失败";
    res.status(500).json({ success: false, message });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const notificationUnreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    const unreadMessageCount = await UnreadMessage.sum('unread_count', {
      where: {
        user_id: req.user.id
      }
    }) || 0;

    const totalUnreadCount = notificationUnreadCount + unreadMessageCount;

    res.json({
      success: true,
      data: {
        unreadCount: totalUnreadCount,
        notificationUnreadCount,
        unreadMessageCount
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取未读计数失败";
    res.status(500).json({ success: false, message });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { id } = req.params;

    const affectedCount = await Notification.update(
      { is_read: true },
      {
        where: {
          id: parseInt(id),
          user_id: req.user.id
        }
      }
    );

    if (affectedCount[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "通知不存在或无权限操作"
      });
    }

    res.json({
      success: true,
      message: "标记已读成功"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "标记已读失败";
    res.status(500).json({ success: false, message });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    // 1. 标记 notifications 表中的消息为已读
    const affectedCount = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: req.user.id,
          is_read: false
        }
      }
    );

    // 2. 标记 unread_messages 表中的聊天消息为已读（将 unread_count 重置为 0）
    const [chatUpdatedCount] = await UnreadMessage.update(
      { unread_count: 0 },
      {
        where: {
          user_id: req.user.id,
          unread_count: { [Op.gt]: 0 }
        }
      }
    );

    const totalMarkedCount = affectedCount[0] + chatUpdatedCount;

    res.json({
      success: true,
      message: `已标记 ${totalMarkedCount} 条通知为已读`,
      data: {
        markedCount: totalMarkedCount,
        notificationCount: affectedCount[0],
        chatMessageCount: chatUpdatedCount
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "标记已读失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { id } = req.params;

    const deletedCount = await Notification.destroy({
      where: {
        id: parseInt(id),
        user_id: req.user.id
      }
    });

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "通知不存在或无权限操作"
      });
    }

    res.json({
      success: true,
      message: "删除通知成功"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除通知失败";
    res.status(500).json({ success: false, message });
  }
};
