import { Request, Response } from "express";
import { Op } from "sequelize";
import StudyRoom from "../models/study-room.model";
import RoomReservation from "../models/room-reservation.model";
import RoomOccupancy from "../models/room-occupancy.model";

// 获取自习室列表
export const getStudyRooms = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, keyword, status, minCapacity, userId } = req.query;
    
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
    
    // 先获取符合条件的自习室基础信息
    const result = await StudyRoom.findAndCountAll({
      where,
      order: [['id', 'ASC']], // 先按ID排序，后面再重新排序
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });
    
    // 为每个自习室查询实时占用人数
    const roomsWithRealOccupancy = await Promise.all(
      result.rows.map(async (room: any) => {
        let activeOccupancyCount = 0;
        let confirmedReservationCount = 0;
        
        // 如果指定了用户ID，则只统计该用户的占用情况
        if (userId) {
          // 查询该用户在该自习室中状态为active的占用记录数
          activeOccupancyCount = await RoomOccupancy.count({
            where: {
              room_id: room.id,
              user_id: Number(userId),
              status: 'active'
            }
          });
          
          // 查询该用户在该自习室中状态为confirmed且在预约时间段内的预约记录数
          const now = new Date();
          confirmedReservationCount = await RoomReservation.count({
            where: {
              room_id: room.id,
              user_id: Number(userId),
              status: 'confirmed',
              start_time: { [Op.lte]: now },
              end_time: { [Op.gt]: now }
            }
          });
        } else {
          // 否则统计所有用户的占用情况
          // 查询该自习室中状态为active的占用记录数
          activeOccupancyCount = await RoomOccupancy.count({
            where: {
              room_id: room.id,
              status: 'active'
            }
          });
          
          // 查询该自习室中状态为confirmed且在预约时间段内的预约记录数
          const now = new Date();
          confirmedReservationCount = await RoomReservation.count({
            where: {
              room_id: room.id,
              status: 'confirmed',
              start_time: { [Op.lte]: now },
              end_time: { [Op.gt]: now }
            }
          });
        }
        
        // 总占用人数 = active占用记录 + 已确认的有效预约记录
        const totalOccupancy = activeOccupancyCount + confirmedReservationCount;
        
        // 返回包含实时占用人数的数据
        return {
          ...room.toJSON(),
          current_occupancy: totalOccupancy
        };
      })
    );
    
    // 按占用人数降序排列
    const sortedRooms = roomsWithRealOccupancy.sort((a, b) => b.current_occupancy - a.current_occupancy);
    
    res.json({
      success: true,
      message: "获取成功",
      data: sortedRooms,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    console.error('获取自习室列表错误:', error);
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
    
    // 检查自习室是否已满（实时查询，包括active占用和已确认的有效预约）
    const activeOccupancyCount = await RoomOccupancy.count({
      where: {
        room_id: roomId,
        status: 'active'
      }
    });
    
    const now = new Date();
    const confirmedReservationCount = await RoomReservation.count({
      where: {
        room_id: roomId,
        status: 'confirmed',
        start_time: { [Op.lte]: now },
        end_time: { [Op.gt]: now }
      }
    });
    
    const totalOccupancy = activeOccupancyCount + confirmedReservationCount;
    
    if (totalOccupancy >= room.capacity) {
      return res.status(400).json({ success: false, message: "自习室已满" });
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



// 退出自习室
export const leaveStudyRoom = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    // 查找用户当前active状态的占用记录
    const occupancy = await RoomOccupancy.findOne({
      where: {
        user_id: req.user.id,
        status: 'active'
      },
      order: [['join_time', 'DESC']]
    });
    
    if (!occupancy) {
      return res.status(400).json({ 
        success: false, 
        message: "您不在任何自习室中" 
      });
    }
    
    // 更新占用记录
    await occupancy.update({
      status: 'left',
      leave_time: new Date()
    });
    
    res.json({
      success: true,
      message: "退出成功",
    });
  } catch (error) {
    console.error('退出自习室错误:', error);
    const message = error instanceof Error ? error.message : "退出失败";
    res.status(500).json({ success: false, message });
  }
};

// 确认预约
export const confirmReservation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { reservationId } = req.body as { reservationId: number };
    
    // 查找预约记录
    const reservation = await RoomReservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "预约记录不存在" });
    }
    
    // 检查是否是当前用户的预约
    if (reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "无权限操作他人预约" });
    }
    
    // 检查状态是否为pending
    if (reservation.status !== 'pending') {
      return res.status(400).json({ success: false, message: "预约状态不是待确认，无法确认" });
    }
    
    // 更新预约状态为confirmed
    await reservation.update({ status: 'confirmed' });
    
    res.json({
      success: true,
      message: "确认成功，预约状态已更新为已确认",
      data: reservation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "确认失败";
    res.status(500).json({ success: false, message });
  }
};

// 检查并更新过期预约状态
export const checkExpiredReservations = async () => {
  try {
    const now = new Date();
    console.log(`开始检查过期预约状态，当前时间: ${now.toISOString()}`);
    
    // 查找所有需要检查的预约记录
    const expiringReservations = await RoomReservation.findAll({
      where: {
        status: { [Op.in]: ['confirmed', 'completed'] },
        end_time: { [Op.lt]: now }
      },
      include: [{
        model: StudyRoom,
        attributes: ['name']
      }]
    });
    
    console.log(`找到 ${expiringReservations.length} 条过期预约记录`);
    expiringReservations.forEach((record: any) => {
      console.log(`过期记录: ID=${record.id}, 状态=${record.status}, 结束时间=${record.end_time}, 自习室=${record.StudyRoom?.name}`);
    });
    
    // 将已结束的预约状态更新为'ended'
    const [updatedCount] = await RoomReservation.update(
      { status: 'ended' },
      {
        where: {
          status: { [Op.in]: ['confirmed', 'completed'] },
          end_time: { [Op.lt]: now }
        }
      }
    );
    
    console.log(`更新了 ${updatedCount} 条预约记录为已结束状态`);
    
    // 删除超过一天的已结束预约
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const deletedCount = await RoomReservation.destroy({
      where: {
        status: 'ended',
        end_time: { [Op.lt]: oneDayAgo }
      }
    });
    
    console.log(`删除了 ${deletedCount} 条超过一天的已结束预约`);
    console.log('预约状态检查完成');
  } catch (error) {
    console.error('检查预约状态失败:', error);
  }
};

// 结束预约（用户主动退出时立即调用）
export const endReservation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { reservationId } = req.body as { reservationId: number };
    
    // 查找预约记录
    const reservation = await RoomReservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "预约记录不存在" });
    }
    
    // 检查是否是当前用户的预约
    if (reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "无权限操作他人预约" });
    }
    
    // 检查状态是否为completed
    if (reservation.status !== 'completed') {
      return res.status(400).json({ success: false, message: "预约状态不是已加入，无法结束" });
    }
    
    // 更新预约状态为ended
    await reservation.update({ status: 'ended' });
    
    res.json({
      success: true,
      message: "预约已结束",
      data: reservation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "结束预约失败";
    res.status(500).json({ success: false, message });
  }
};

// 完成预约（加入自习室后调用）
export const completeReservation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { reservationId } = req.body as { reservationId: number };
    
    // 查找预约记录
    const reservation = await RoomReservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "预约记录不存在" });
    }
    
    // 检查是否是当前用户的预约
    if (reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "无权限操作他人预约" });
    }
    
    // 检查状态是否为confirmed
    if (reservation.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: "预约状态不是已确认，无法完成" });
    }
    
    // 更新预约状态为completed
    await reservation.update({ status: 'completed' });
    
    res.json({
      success: true,
      message: "预约已完成",
      data: reservation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "完成失败";
    res.status(500).json({ success: false, message });
  }
};

// 取消预约
export const cancelReservation = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { reservationId } = req.body as { reservationId: number };
    
    // 查找预约记录
    const reservation = await RoomReservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: "预约记录不存在" });
    }
    
    // 检查是否是当前用户的预约
    if (reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "无权限操作他人预约" });
    }
    
    // 检查状态是否为pending或confirmed
    if (reservation.status !== 'pending' && reservation.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: "预约状态已结束，无法取消" });
    }
    
    // 更新预约状态为cancelled
    await reservation.update({ status: 'cancelled' });
    
    res.json({
      success: true,
      message: "取消成功，预约状态已更新为已取消",
      data: reservation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消失败";
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
    
    // 调试信息：记录查询条件
    console.log(`用户 ${req.user.id} 查询预约记录，条件:`, { page, pageSize, status, where });
    
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
    
    // 调试信息：记录查询结果
    console.log(`找到 ${result.count} 条预约记录`);
    result.rows.forEach((record: any, index: number) => {
      console.log(`记录 ${index + 1}: ID=${record.id}, 状态=${record.status}, 结束时间=${record.end_time}`);
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
    console.error('获取预约记录失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};