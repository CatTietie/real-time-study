import { Request, Response } from "express";
import Whiteboard from "../models/whiteboard.model";
import WhiteboardAction from "../models/whiteboard-action.model";

export const createWhiteboard = async (req: Request, res: Response) => {
  try {
    const { roomId, name, width, height, backgroundColor } = req.body;
    const userId = req.user?.id;

    const whiteboard = await Whiteboard.create({
      room_id: roomId,
      name: name || '协作白板',
      width: width || 1200,
      height: height || 800,
      background_color: backgroundColor || '#FFFFFF'
    });

    res.json({
      success: true,
      message: "白板创建成功",
      data: whiteboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建失败"
    });
  }
};

export const getWhiteboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const whiteboard = await Whiteboard.findByPk(id);
    
    if (!whiteboard) {
      return res.status(404).json({
        success: false,
        message: "白板不存在"
      });
    }

    res.json({
      success: true,
      data: whiteboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取失败"
    });
  }
};

export const getWhiteboardActions = async (req: Request, res: Response) => {
  try {
    const { whiteboardId } = req.params;
    const { page = 1, pageSize = 100 } = req.query;

    const actions = await WhiteboardAction.findAndCountAll({
      where: { whiteboard_id: whiteboardId },
      order: [['timestamp', 'ASC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    });

    res.json({
      success: true,
      data: actions.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: actions.count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取操作记录失败"
    });
  }
};

export const clearWhiteboard = async (req: Request, res: Response) => {
  try {
    const { whiteboardId } = req.params;
    const userId = req.user?.id;

    // 记录清空操作
    await WhiteboardAction.create({
      whiteboard_id: whiteboardId,
      user_id: userId,
      action_type: 'clear',
      data: JSON.stringify({ clearedAt: new Date() })
    });

    res.json({
      success: true,
      message: "白板已清空"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "清空白板失败"
    });
  }
};
