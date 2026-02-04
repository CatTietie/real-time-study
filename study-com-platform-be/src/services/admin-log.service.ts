// 管理员操作日志服务
import AdminLog from "../models/admin-log.model";
import User from "../models/user.model";
import { Op } from "sequelize";
import { Request } from "express";

/**
 * 记录管理员操作
 */
export const recordAdminLog = async (
  adminId: number,
  actionType: string,
  targetTable?: string,
  targetId?: number,
  detail?: string,
  _req?: Request,
) => {
  try {
    await AdminLog.create({
      admin_id: adminId,
      action_type: actionType,
      target_table: targetTable,
      target_id: targetId,
      detail: detail,
    });

    return true;
  } catch (error) {
    console.error("记录操作日志失败:", error);
    // 日志记录失败不应该影响主业务逻辑
    return false;
  }
};

/**
 * 获取操作日志列表
 */
export const getAdminLogs = async (options: {
  page?: number;
  pageSize?: number;
  adminId?: number;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  const {
    page = 1,
    pageSize = 20,
    adminId,
    actionType,
    startDate,
    endDate,
  } = options;

  const where: any = {};

  if (adminId) {
    where.admin_id = adminId;
  }

  if (actionType) {
    where.action_type = actionType;
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) {
      where.created_at[Op.gte] = startDate;
    }
    if (endDate) {
      where.created_at[Op.lte] = endDate;
    }
  }

  const offset = (page - 1) * pageSize;

  const { rows, count } = await AdminLog.findAndCountAll({
    where,
    limit: pageSize,
    offset,
    order: [["created_at", "DESC"]],
    include: [
      {
        model: User,
        attributes: ["id", "username", "nickname"],
      },
    ],
  });

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    },
  };
};

/**
 * 获取操作日志统计
 */
export const getAdminLogStats = async () => {
  const total = await AdminLog.count();

  // 获取最近 24 小时的日志数
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayCount = await AdminLog.count({
    where: {
      created_at: {
        [Op.gte]: oneDayAgo,
      },
    },
  });

  // 获取各操作类型的统计
  const actionStats = await AdminLog.sequelize?.query(
    `SELECT action_type, COUNT(*) as count FROM admin_logs GROUP BY action_type`,
    { raw: true },
  );

  return {
    total,
    todayCount,
    actionStats,
  };
};

/**
 * 操作类型列表
 */
export const ActionTypes = {
  LOGIN: "管理员登录",
  LOGOUT: "管理员登出",
  USER_BAN: "封禁用户",
  USER_UNBAN: "解禁用户",
  POST_REVIEW: "审核帖子",
  POST_DELETE: "删除帖子",
  COMMENT_REVIEW: "审核评论",
  COMMENT_DELETE: "删除评论",
  REPORT_HANDLE: "处理举报",
  SENSITIVE_WORD_ADD: "添加敏感词",
  SENSITIVE_WORD_DELETE: "删除敏感词",
  SYSTEM_CONFIG: "修改系统配置",
};
