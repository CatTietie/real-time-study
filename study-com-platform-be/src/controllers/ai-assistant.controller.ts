import { Request, Response } from "express";
import AiChatHistory from "../models/ai-chat-history.model";

export const getAiChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { postId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!postId) {
      return res.status(400).json({ success: false, message: "缺少帖子ID" });
    }

    const { count, rows } = await AiChatHistory.findAndCountAll({
      where: { user_id: userId, post_id: parseInt(postId) },
      attributes: [
        "id", "user_id", "post_id", "question", "answer",
        "prompt_tokens", "completion_tokens", "total_tokens",
        "model", "feedback", "sources_json", "created_at", "updated_at",
      ],
      order: [["created_at", "ASC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        total: count,
        records: rows,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[AI助手] 获取历史记录失败:", error);
    res.status(500).json({ success: false, message: "获取历史记录失败" });
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { historyId } = req.params;
    const { feedback } = req.body;

    if (!historyId || !["helpful", "unhelpful"].includes(feedback)) {
      return res.status(400).json({ success: false, message: "参数无效" });
    }

    const record = await AiChatHistory.findOne({
      where: { id: parseInt(historyId), user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }

    const newFeedback = record.feedback === feedback ? null : feedback;
    await record.update({ feedback: newFeedback });

    res.json({
      success: true,
      data: { historyId: record.id, feedback: newFeedback },
    });
  } catch (error) {
    console.error("[AI助手] 提交反馈失败:", error);
    res.status(500).json({ success: false, message: "提交反馈失败" });
  }
};
