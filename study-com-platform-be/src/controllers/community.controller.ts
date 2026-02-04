// 社区管理控制器（管理员）
import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import Report from "../models/report.model";
import User from "../models/user.model";
import * as commentService from "../services/comment.service";
import { addPoints } from "../services/points.service";
import ContentAudit from "../models/content-audit.model";

export const getCommunityPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword } = req.query;

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

    const approvedCount = await Post.count({
      where: {
        status: 1,
        [Op.and]: [
          Sequelize.where(Sequelize.col("created_at"), {
            [Op.gte]: startOfDay,
          }),
        ],
      },
    });
    const auditedCount = await Post.count({
      where: {
        status: { [Op.in]: [1, 2] },
        [Op.and]: [
          Sequelize.where(Sequelize.col("created_at"), {
            [Op.gte]: startOfDay,
          }),
        ],
      },
    });
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
