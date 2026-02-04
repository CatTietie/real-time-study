// 帖子控制器
import { Request, Response } from "express";

export const createPost = async (req: Request, res: Response) => {
  try {
    // 创建帖子逻辑
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};

export const getPost = async (req: Request, res: Response) => {
  try {
    // 获取帖子逻辑
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};
