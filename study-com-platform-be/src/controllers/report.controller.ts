// 举报控制器
import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import Report from "../models/report.model";
import User from "../models/user.model";
import Post from "../models/post.model";
import Comment from "../models/comment.model";

export const createReport = async (req: Request, res: Response) => {
  try {
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword, targetType } = req.query;

    const where: any = {};
    if (status !== undefined) {
      where.status = Number(status);
    }
    if (targetType) {
      where.target_type = String(targetType);
    }
    if (keyword) {
      where.reason = { [Op.like]: `%${keyword}%` };
    }

    const result = await Report.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ["id", "username", "nickname"] },
        {
          model: User,
          as: "handler",
          attributes: ["id", "username", "nickname"],
        },
      ],
      order: [[Sequelize.col("created_at"), "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    const rows = result.rows.map((report) => report.toJSON() as any);
    const postIds = rows
      .filter((item) => item.target_type === "post")
      .map((item) => item.target_id);
    const commentIds = rows
      .filter((item) => item.target_type === "comment")
      .map((item) => item.target_id);

    const [posts, comments] = await Promise.all([
      postIds.length
        ? Post.findAll({
            where: { id: postIds },
            attributes: ["id", "title", "status", "publish_status"],
          })
        : Promise.resolve([]),
      commentIds.length
        ? Comment.findAll({
            where: { id: commentIds },
            attributes: ["id", "content", "status"],
          })
        : Promise.resolve([]),
    ]);

    const postMap = new Map(posts.map((item) => [item.id, item]));
    const commentMap = new Map(comments.map((item) => [item.id, item]));

    const data = rows.map((item) => {
      const target =
        item.target_type === "post"
          ? postMap.get(item.target_id)
          : commentMap.get(item.target_id);
      return {
        ...item,
        target: target ? ((target as any).toJSON?.() ?? target) : null,
      };
    });

    res.json({
      success: true,
      message: "获取举报成功",
      data,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取举报失败";
    res.status(500).json({ success: false, message });
  }
};

export const handleReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const id = Number(req.params.id);
    const { handleResult, action } = req.body as {
      handleResult?: string;
      action?: "approve" | "reject";
    };

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, message: "举报不存在" });
    }

    if (report.target_type === "post" && action) {
      const post = await Post.findByPk(report.target_id);
      if (post) {
        const nextStatus = action === "approve" ? 1 : 2;
        await post.update({
          status: nextStatus,
          audit_admin_id: req.user.id,
          audit_reason: handleResult,
          audit_at: new Date(),
        });
      }
    }

    await report.update({
      status: 1,
      handle_result: handleResult,
      handler_admin_id: req.user.id,
      handled_at: new Date(),
    });

    res.json({ success: true, message: "处理成功", data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "处理失败";
    res.status(500).json({ success: false, message });
  }
};
