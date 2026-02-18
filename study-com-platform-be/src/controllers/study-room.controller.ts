import { Request, Response } from "express";
import { Op } from "sequelize";
import StudyRoom from "../models/study-room.model";
import RoomReservation from "../models/room-reservation.model";
import RoomOccupancy from "../models/room-occupancy.model";
import User from "../models/user.model";

// 获取自习室列表
export const getStudyRooms = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, keyword, status, minCapacity } = req.query;
    
    const where: any = {};
    
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
        { location: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (minCapacity) {
      where.capacity = { [Op.gte]: Number(minCapacity) };
    }
    
    const result = await StudyRoom.findAndCountAll({
      where,
      order: [['current_occupancy', 'DESC']],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });
    
    res.json({
      success: true,
      message: "获取成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

// 获取自习室详情
export const getStudyRoomDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const room = await StudyRoom.findByPk(id);
    
    if (!room) {
      return res.status(404).json({ success: false, message: "自习室不存在" });
    }
    
    res.json({
      success: true,
      message: "获取成功",
      data: room,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

// 预约自习室
export const reserveStudyRoom = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { roomId, startTime, endTime } = req.body as {
      roomId: number;
      startTime: string;
      endTime: string;
    };
    
    // 检查自习室是否存在且可用
    const room = await StudyRoom.findByPk(roomId);
    if (!room || room.status !== 'active') {
      return res.status(400).json({ success: false, message: "自习室不可用" });
    }
    
    // 检查时间冲突
    const existingReservations = await RoomReservation.count({
      where: {
        room_id: roomId,
        status: { [Op.in]: ['pending', 'confirmed'] },
        [Op.or]: [
          {
            start_time: { [Op.between]: [startTime, endTime] }
          },
          {
            end_time: { [Op.between]: [startTime, endTime] }
          },
          {
            [Op.and]: [
              { start_time: { [Op.lte]: startTime } },
              { end_time: { [Op.gte]: endTime } }
            ]
          }
        ]
      }
    });
    
    if (existingReservations > 0) {
      return res.status(400).json({ success: false, message: "时间段已被预约" });
    }
    
    // 创建预约
    const reservation = await RoomReservation.create({
      user_id: req.user.id,
      room_id: roomId,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
      status: 'pending'
    });
    
    res.json({
      success: true,
      message: "预约成功，请等待确认",
      data: reservation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "预约失败";
    res.status(500).json({ success: false, message });
  }
};

// 加入自习室
export const joinStudyRoom = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { roomId } = req.body as { roomId: number };
    
    // 检查自习室是否存在且可用
    const room = await StudyRoom.findByPk(roomId);
    if (!room || room.status !== 'active') {
      return res.status(400).json({ success: false, message: "自习室不可用" });
    }
    
    // 检查是否已在其他自习室
    const existingOccupancy = await RoomOccupancy.findOne({
      where: {
        user_id: req.user.id,
        status: 'active'
      }
    });
    
    if (existingOccupancy) {
      return res.status(400).json({ success: false, message: "您已在其他自习室中" });
    }
    
    // 检查容量限制
    if (room.current_occupancy >= room.capacity) {
      return res.status(400).json({ success: false, message: "自习室已满" });
    }
    
    // 创建占用记录
    await RoomOccupancy.create({
      user_id: req.user.id,
      room_id: roomId,
      status: 'active'
    });
    
    // 更新自习室当前人数
    await room.increment('current_occupancy');
    
    res.json({
      success: true,
      message: "加入成功",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加入失败";
    res.status(500).json({ success: false, message });
  }
};

// 退出自习室
export const leaveStudyRoom = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    // 查找当前占用记录
    const occupancy = await RoomOccupancy.findOne({
      where: {
        user_id: req.user.id,
        status: 'active'
      }
    });
    
    if (!occupancy) {
      return res.status(400).json({ success: false, message: "您不在任何自习室中" });
    }
    
    // 更新占用记录
    await occupancy.update({
      status: 'left',
      leave_time: new Date()
    });
    
    // 更新自习室当前人数
    const room = await StudyRoom.findByPk(occupancy.room_id);
    if (room) {
      await room.decrement('current_occupancy');
    }
    
    res.json({
      success: true,
      message: "退出成功",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "退出失败";
    res.status(500).json({ success: false, message });
  }
};

// 获取我的预约记录
export const getMyReservations = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { page = 1, pageSize = 10, status } = req.query;
    
    const where: any = { user_id: req.user.id };
    if (status) {
      where.status = status;
    }
    
    const result = await RoomReservation.findAndCountAll({
      where,
      include: [{
        model: StudyRoom,
        attributes: ['id', 'name', 'location']
      }],
      order: [['created_at', 'DESC']],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });
    
    res.json({
      success: true,
      message: "获取成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};