import { Request, Response } from "express";
import Whiteboard from "../models/whiteboard.model";
import WhiteboardAction from "../models/whiteboard-action.model";
import ChatRoom from "../models/chat-room.model";

export const createWhiteboard = async (req: Request, res: Response) => {
  try {
    console.log('Received whiteboard creation request:', req.body);
    const { roomId, name, width, height, backgroundColor, type } = req.body;
    const userId = req.user?.id;
    
    console.log('User ID:', userId);
    console.log('Request body:', { roomId, name, width, height, backgroundColor, type });
    
    // 参数验证
    if (!roomId) {
      console.log('Room ID is missing');
      return res.status(400).json({
        success: false,
        message: "房间ID不能为空"
      });
    }
    
    if (typeof roomId !== 'number' || roomId <= 0) {
      console.log('Invalid room ID type or value:', typeof roomId, roomId);
      return res.status(400).json({
        success: false,
        message: "房间ID必须是正整数"
      });
    }
    
    // 验证聊天室是否存在
    console.log('Checking if chat room exists:', roomId);
    const chatRoom = await ChatRoom.findByPk(roomId);
    console.log('Chat room found:', chatRoom);
    
    if (!chatRoom) {
      console.log('Chat room not found');
      return res.status(404).json({
        success: false,
        message: "指定的聊天室不存在"
      });
    }

    console.log('Creating whiteboard with data:', {
      room_id: roomId,
      name: name || '协作白板',
      type: type || 'general',
      width: width || 1200,
      height: height || 800,
      background_color: backgroundColor || '#FFFFFF'
    });

    const whiteboard = await Whiteboard.create({
      room_id: roomId,
      name: name || '协作白板',
      type: type || 'general',
      width: width || 1200,
      height: height || 800,
      background_color: backgroundColor || '#FFFFFF'
    });

    console.log('Whiteboard created successfully:', whiteboard.toJSON());

    res.json({
      success: true,
      message: "白板创建成功",
      data: whiteboard
    });
  } catch (error) {
    console.error('Whiteboard creation error:', error);
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

// 导出白板为PNG图片
export const exportWhiteboardToPng = async (req: Request, res: Response) => {
  try {
    const { whiteboardId } = req.params;
    
    // 获取白板基本信息
    const whiteboard = await Whiteboard.findByPk(whiteboardId);
    if (!whiteboard) {
      return res.status(404).json({
        success: false,
        message: "白板不存在"
      });
    }
    
    // 获取白板的所有操作记录
    const actions = await WhiteboardAction.findAll({
      where: { whiteboard_id: whiteboardId },
      order: [['timestamp', 'ASC']]
    });
    
    // 返回白板数据供前端渲染
    res.json({
      success: true,
      data: {
        whiteboard: whiteboard.toJSON(),
        actions: actions.map(action => action.toJSON())
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "导出失败"
    });
  }
};
