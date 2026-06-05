// 社区管理控制器（管理员）
import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import Report from "../models/report.model";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import * as commentService from "../services/comment.service";
import { addPoints } from "../services/points.service";
import ContentAudit from "../models/content-audit.model";
import { getSocketIo } from "../utils/socketManager";
import { sendAuditNotification } from "../services/audit-notification.service";
import { sequelize } from "../config/sequelize";

export const getCommunityPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword, category, startDate, endDate } = req.query;

    const where: any = {};
    if (status !== undefined) {
      where.status = Number(status);
    }
    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (category) {
      where.category = category;
    }
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }

    const result = await Post.findAndCountAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname"],
        },
      ],
      order: [[Sequelize.col("created_at"), "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    res.json({
      success: true,
      message: "获取帖子成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取帖子失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateCommunityPostStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const { status, reason } = req.body as {
      status: number;
      reason?: string;
    };

    if (![0, 1, 2].includes(Number(status))) {
      return res.status(400).json({ success: false, message: "无效的状态值" });
    }

    const existing = await Post.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    const [updated] = await Post.update(
      {
        status: Number(status),
        audit_admin_id: req.user.id,
        audit_reason: reason,
        audit_at: new Date(),
      },
      { where: { id } },
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "帖子不存在" });
    }

    if (Number(status) === 1 && existing.status !== 1) {
      await addPoints({
        userId: existing.user_id,
        change: 5,
        reason: "post_approved",
        sourceType: "post",
        sourceId: existing.id,
      });
    }

    if (Number(status) === 1 || Number(status) === 2) {
      await ContentAudit.create({
        target_type: "post",
        target_id: existing.id,
        status: Number(status),
        reason,
        admin_id: req.user.id,
      });

      await sendAuditNotification(
        { id: existing.id, user_id: existing.user_id, title: existing.title },
        Number(status) as 1 | 2,
        reason,
      );
    }

    const post = await Post.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ["id", "username", "nickname"],
        },
      ],
    });

    res.json({
      success: true,
      message: "更新成功",
      data: post,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityComments = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword } = req.query;

    const result = await commentService.getComments({
      page: Number(page),
      pageSize: Number(pageSize),
      status: status === undefined ? undefined : Number(status),
      keyword: keyword ? String(keyword) : undefined,
    });

    res.json({
      success: true,
      message: "获取评论成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取评论失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateCommunityCommentStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const { status, reason } = req.body as { status: number; reason?: string };

    if (![0, 1].includes(Number(status))) {
      return res.status(400).json({ success: false, message: "无效的状态值" });
    }

    const existing = await Comment.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "评论不存在" });
    }

    const [updated] = await commentService.updateCommentStatus(
      id,
      Number(status),
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "评论不存在" });
    }

    if (Number(status) === 1 && existing.status !== 1) {
      await Post.increment(
        { comment_count: 1 },
        { where: { id: existing.post_id } },
      );
    }

    if (Number(status) === 0 && existing.status === 1) {
      await Post.decrement(
        { comment_count: 1 },
        { where: { id: existing.post_id } },
      );
    }

    if (req.user) {
      await ContentAudit.create({
        target_type: "comment",
        target_id: id,
        status: Number(status) === 1 ? 1 : 2,
        reason,
        admin_id: req.user.id,
      });
    }

    const comment = await Comment.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "username", "nickname"] },
        { model: Post, attributes: ["id", "title"] },
      ],
    });

    res.json({ success: true, message: "更新成功", data: comment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const getCommunityStats = async (req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayPosts, todayComments, pendingReports] = await Promise.all([
      Post.count({
        where: {
          [Op.and]: [
            Sequelize.where(Sequelize.col("created_at"), {
              [Op.gte]: startOfDay,
            }),
          ],
        },
      }),
      Comment.count({
        where: {
          [Op.and]: [
            Sequelize.where(Sequelize.col("created_at"), {
              [Op.gte]: startOfDay,
            }),
          ],
        },
      }),
      Report.count({ where: { status: 0 } }),
    ]);

    // 从 content_audits 表统计今日审核操作数，避免同一帖子多次审核时计数被覆盖
    const [approvedCount, rejectedCount] = await Promise.all([
      ContentAudit.count({
        where: {
          target_type: "post",
          status: 1,
          created_at: { [Op.gte]: startOfDay },
        },
      }),
      ContentAudit.count({
        where: {
          target_type: "post",
          status: 2,
          created_at: { [Op.gte]: startOfDay },
        },
      }),
    ]);
    const auditedCount = approvedCount + rejectedCount;
    const passRate = auditedCount
      ? Math.round((approvedCount / auditedCount) * 100)
      : 0;

    res.json({
      success: true,
      message: "获取统计成功",
      data: {
        todayPosts,
        todayComments,
        pendingReports,
        passRate,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取统计失败";
    res.status(500).json({ success: false, message });
  }
};

export const batchAuditPosts = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { ids, status, reason } = req.body as {
      ids: number[];
      status: number;
      reason?: string;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "请选择要审核的帖子" });
    }

    if (![1, 2].includes(Number(status))) {
      return res.status(400).json({ success: false, message: "无效的状态值" });
    }

    if (Number(status) === 2 && !reason) {
      return res.status(400).json({ success: false, message: "驳回时必须填写原因" });
    }

    let updated = 0;
    let failed = 0;
    const notifyQueue: Array<{ id: number; user_id: number; title: string; shouldAddPoints: boolean }> = [];

    const transaction = await sequelize.transaction();
    try {
      for (const postId of ids) {
        const post = await Post.findByPk(postId, { transaction });
        if (!post || post.status === Number(status)) {
          failed++;
          continue;
        }

        const shouldAddPoints = Number(status) === 1 && post.status !== 1;

        await Post.update(
          {
            status: Number(status),
            audit_admin_id: req.user.id,
            audit_reason: reason || null,
            audit_at: new Date(),
          },
          { where: { id: postId }, transaction },
        );

        await ContentAudit.create(
          {
            target_type: "post",
            target_id: postId,
            status: Number(status),
            reason: reason || null,
            admin_id: req.user.id,
          },
          { transaction },
        );

        notifyQueue.push({ id: post.id, user_id: post.user_id, title: post.title, shouldAddPoints });
        updated++;
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    // 事务提交后再发送通知和加积分，避免副作用导致回滚丢失审核记录
    for (const item of notifyQueue) {
      try {
        if (item.shouldAddPoints) {
          await addPoints({
            userId: item.user_id,
            change: 5,
            reason: "post_approved",
            sourceType: "post",
            sourceId: item.id,
          });
        }
        await sendAuditNotification(
          { id: item.id, user_id: item.user_id, title: item.title },
          Number(status) as 1 | 2,
          reason,
        );
      } catch {
        // 通知或积分失败不影响审核结果
      }
    }

    res.json({
      success: true,
      message: `批量审核完成，成功 ${updated} 篇，跳过 ${failed} 篇`,
      data: { total: ids.length, updated, failed },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量审核失败";
    res.status(500).json({ success: false, message });
  }
};

export const getAuditStats = async (req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 从 content_audits 审核记录表统计今日审核次数（每次操作都会产生一条记录，不受帖子状态覆盖影响）
    const [totalPending, todayApprovedActions, todayRejectedActions, todayPending] =
      await Promise.all([
        Post.count({ where: { status: 0, publish_status: 1 } }),
        ContentAudit.count({
          where: {
            target_type: "post",
            status: 1,
            created_at: { [Op.gte]: startOfDay },
          },
        }),
        ContentAudit.count({
          where: {
            target_type: "post",
            status: 2,
            created_at: { [Op.gte]: startOfDay },
          },
        }),
        Post.count({
          where: {
            status: 0,
            created_at: { [Op.gte]: startOfDay },
          },
        }),
      ]);

    const todayAudited = todayApprovedActions + todayRejectedActions;
    const passRate = todayAudited > 0
      ? Math.round((todayApprovedActions / todayAudited) * 100)
      : 0;

    // 计算平均审核时长（最近30天内已审核的帖子，基于帖子表的 audit_at - created_at）
    const avgResult = await Post.findOne({
      attributes: [
        [
          Sequelize.fn(
            "AVG",
            Sequelize.fn(
              "TIMESTAMPDIFF",
              Sequelize.literal("MINUTE"),
              Sequelize.col("created_at"),
              Sequelize.col("audit_at"),
            ),
          ),
          "avg_minutes",
        ],
      ],
      where: {
        status: { [Op.in]: [1, 2] },
        audit_at: { [Op.gte]: thirtyDaysAgo },
      },
      raw: true,
    });

    const avgAuditDurationMinutes = Math.round(
      Number((avgResult as any)?.avg_minutes) || 0,
    );

    const totalAudited = await ContentAudit.count({
      where: { target_type: "post" },
    });

    res.json({
      success: true,
      message: "获取审核统计成功",
      data: {
        totalPending,
        totalAudited,
        todayAudited,
        passRate,
        avgAuditDurationMinutes,
        todayStats: {
          approved: todayApprovedActions,
          rejected: todayRejectedActions,
          pending: todayPending,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取审核统计失败";
    res.status(500).json({ success: false, message });
  }
};
