import { Request, Response } from "express";
import Notification from "../models/notification.model";
import { Op } from "sequelize";

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

    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => n.toJSON()),
        unreadCount
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

    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.json({
      success: true,
      data: {
        unreadCount
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

    const affectedCount = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: req.user.id,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: `已标记 ${affectedCount[0]} 条通知为已读`,
      data: {
        markedCount: affectedCount[0]
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
