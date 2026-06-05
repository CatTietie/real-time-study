import { Request, Response } from "express";
import { Op } from "sequelize";
import UserRecommendation from "../models/user-recommendation.model";
import RecommendationFeedback from "../models/recommendation-feedback.model";
import Post from "../models/post.model";
import StudyRoom from "../models/study-room.model";
import User from "../models/user.model";
import { runRecommendationEngine } from "../services/recommendation-cron.service";

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未登录" });
    }

    const userId = req.user.id;

    const recommendations = await UserRecommendation.findAll({
      where: {
        user_id: userId,
        status: "active",
      },
      order: [["score", "DESC"]],
      limit: 20,
    });

    // 分别加载帖子和自习室详情
    const postIds = recommendations
      .filter((r) => r.target_type === "post")
      .map((r) => r.target_id);
    const roomIds = recommendations
      .filter((r) => r.target_type === "study_room")
      .map((r) => r.target_id);

    const posts = postIds.length > 0
      ? await Post.findAll({
          where: { id: { [Op.in]: postIds } },
          attributes: ["id", "title", "category", "tags", "like_count", "comment_count", "view_count", "created_at"],
          include: [{ model: User, as: "User", attributes: ["id", "nickname", "avatar"] }],
        })
      : [];

    const rooms = roomIds.length > 0
      ? await StudyRoom.findAll({
          where: { id: { [Op.in]: roomIds } },
          attributes: ["id", "name", "description", "capacity", "current_occupancy", "image_url", "status"],
        })
      : [];

    const postMap = new Map(posts.map((p) => [p.id, p]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const data = recommendations
      .map((rec) => {
        const detail =
          rec.target_type === "post"
            ? postMap.get(rec.target_id)
            : roomMap.get(rec.target_id);

        if (!detail) return null;

        return {
          id: rec.id,
          target_type: rec.target_type,
          target_id: rec.target_id,
          score: rec.score,
          reason: rec.reason,
          detail: detail.toJSON(),
        };
      })
      .filter(Boolean);

    res.json({ success: true, message: "获取推荐成功", data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取推荐失败";
    res.status(500).json({ success: false, message });
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未登录" });
    }

    const userId = req.user.id;
    const recommendationId = parseInt(req.params.id);
    const { action } = req.body;

    if (!["click", "favorite", "dismiss"].includes(action)) {
      return res.status(400).json({ success: false, message: "无效的反馈类型" });
    }

    const recommendation = await UserRecommendation.findOne({
      where: { id: recommendationId, user_id: userId },
    });

    if (!recommendation) {
      return res.status(404).json({ success: false, message: "推荐记录不存在" });
    }

    await RecommendationFeedback.create({
      user_id: userId,
      recommendation_id: recommendationId,
      action,
    });

    if (action === "dismiss") {
      await recommendation.update({ status: "dismissed" });
    }

    res.json({ success: true, message: "反馈已记录" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交反馈失败";
    res.status(500).json({ success: false, message });
  }
};

// 手动触发推荐计算（管理员调试用）
export const triggerRecommendationEngine = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未登录" });
    }

    runRecommendationEngine();
    res.json({ success: true, message: "推荐引擎已触发执行（后台运行中）" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "触发失败";
    res.status(500).json({ success: false, message });
  }
};
