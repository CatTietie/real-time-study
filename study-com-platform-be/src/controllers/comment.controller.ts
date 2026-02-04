// 评论控制器
import { Request, Response } from "express";

export const createComment = async (req: Request, res: Response) => {
  try {
    // 创建评论逻辑
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    // 删除评论逻辑
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};
