import { Request, Response } from "express";
import ChatRoom from "../models/chat-room.model";
import ChatMessage from "../models/chat-message.model";
import { Op } from "sequelize";

export const createChatRoom = async (req: Request, res: Response) => {
  try {
    const { name, type, maxUsers } = req.body;
    const userId = req.user?.id;

    const room = await ChatRoom.create({
      name,
      type: type || 'study_group',
      max_users: maxUsers || 50,
      created_by: userId
    });

    res.json({
      success: true,
      message: "聊天室创建成功",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "创建失败"
    });
  }
};

export const getChatRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await ChatRoom.findAll({
      include: [{
        association: 'createdBy',
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取失败"
    });
  }
};

export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { page = 1, pageSize = 50 } = req.query;

    const messages = await ChatMessage.findAndCountAll({
      where: { room_id: roomId },
      include: [{
        association: 'user',
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['created_at', 'ASC']],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize)
    });

    res.json({
      success: true,
      data: messages.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: messages.count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "获取消息失败"
    });
  }
};
