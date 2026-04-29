import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
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
          
          // 查询该用户在该自习室中状态为confirmed或in_progress且在预约时间段内的预约记录数
          const now = new Date();
          confirmedReservationCount = await RoomReservation.count({
            where: {
              room_id: room.id,
              user_id: Number(userId),
              status: { [Op.in]: ['confirmed', 'in_progress'] },
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
          
          // 查询该自习室中状态为confirmed或in_progress且在预约时间段内的预约记录数
          const now = new Date();
          confirmedReservationCount = await RoomReservation.count({
            where: {
              room_id: room.id,
              status: { [Op.in]: ['confirmed', 'in_progress'] },
              start_time: { [Op.lte]: now },
              end_time: { [Op.gt]: now }
            }
          });
        }
        
        // 总占用人数 = active占用记录 + 已确认的有效预约记录
        const totalOccupancy = activeOccupancyCount + confirmedReservationCount;
        
        // 查询该自习室所有未来的已确认和已进入状态的预约时间段
        const now = new Date();
        const futureReservations = await RoomReservation.findAll({
          where: {
            room_id: room.id,
            status: { [Op.in]: ['confirmed', 'in_progress'] },
            end_time: { [Op.gt]: now }
          },
          attributes: ['start_time', 'end_time'],
          order: [['start_time', 'ASC']]
        });
        
        // 格式化预约时间段
        const reservedTimeSlots = futureReservations.map((res: any) => ({
          start_time: res.start_time,
          end_time: res.end_time
        }));
        
        // 返回包含实时占用人数和已预约时间段的数据
        return {
          ...room.toJSON(),
          current_occupancy: totalOccupancy,
          reserved_time_slots: reservedTimeSlots
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

// 预约错误码
const RESERVATION_ERROR_CODES = {
  ROOM_UNAVAILABLE: 'ROOM_UNAVAILABLE',
  ROOM_FULL: 'ROOM_FULL',
  DUPLICATE_RESERVATION: 'DUPLICATE_RESERVATION',
  PAST_TIME: 'PAST_TIME',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
} as const;

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
    
    // 检查是否是过去的时间
    const now = new Date();
    const startDate = new Date(startTime);
    if (startDate < now) {
      return res.status(400).json({ 
        success: false, 
        message: "无法预约过去的时间段",
        errorCode: RESERVATION_ERROR_CODES.PAST_TIME
      });
    }
    
    // 检查自习室是否存在且可用
    const room = await StudyRoom.findByPk(roomId);
    if (!room || room.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: "自习室不可用",
        errorCode: RESERVATION_ERROR_CODES.ROOM_UNAVAILABLE
      });
    }
    
    // 检查容量：统计用户预约时间段内的已确认和已进入状态的预约数量
    const timeSlotReservationCount = await RoomReservation.count({
      where: {
        room_id: roomId,
        status: { [Op.in]: ['confirmed', 'in_progress'] },
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
    
    if (timeSlotReservationCount >= room.capacity) {
      return res.status(400).json({ 
        success: false, 
        message: "该时间段自习室已满",
        errorCode: RESERVATION_ERROR_CODES.ROOM_FULL,
        data: {
          currentCount: timeSlotReservationCount,
          capacity: room.capacity
        }
      });
    }
    
    // 检查是否是同一学生同一自习室同一时间段的重复预约
    const duplicateReservation = await RoomReservation.findOne({
      where: {
        user_id: req.user.id,
        room_id: roomId,
        status: { [Op.in]: ['confirmed', 'in_progress'] },
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
      },
      include: [{
        model: StudyRoom,
        attributes: ['id', 'name', 'location']
      }]
    });
    
    if (duplicateReservation) {
      return res.status(400).json({ 
        success: false, 
        message: "您在该时间段已有预约",
        errorCode: RESERVATION_ERROR_CODES.DUPLICATE_RESERVATION,
        data: {
          reservationId: duplicateReservation.id,
          startTime: duplicateReservation.start_time,
          endTime: duplicateReservation.end_time,
          roomName: (duplicateReservation as any).StudyRoom?.name,
          roomLocation: (duplicateReservation as any).StudyRoom?.location
        }
      });
    }
    
    // 创建预约，直接设为已确认状态
    const reservation = await RoomReservation.create({
      user_id: req.user.id,
      room_id: roomId,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
      status: 'confirmed'
    });
    
    res.json({
      success: true,
      message: "预约成功",
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

// 检查并更新预约状态（自动转换）
// 状态转换：confirmed -> in_progress -> ended
// - 当时间 >= start_time 时，从 confirmed 转换为 in_progress
// - 当时间 >= end_time 时，从 in_progress 转换为 ended
export const checkExpiredReservations = async () => {
  try {
    const now = new Date();
    console.log(`开始检查预约状态，当前时间: ${now.toISOString()}`);
    
    // 1. 第一阶段：将已到开始时间的 confirmed 状态转换为 in_progress
    const confirmedToInProgress = await RoomReservation.findAll({
      where: {
        status: 'confirmed',
        start_time: { [Op.lte]: now }
      },
      include: [{
        model: StudyRoom,
        attributes: ['name']
      }]
    });
    
    console.log(`找到 ${confirmedToInProgress.length} 条已到开始时间的 confirmed 状态预约`);
    confirmedToInProgress.forEach((record: any) => {
      console.log(`准备转换: ID=${record.id}, 状态=confirmed, 开始时间=${record.start_time}, 自习室=${record.StudyRoom?.name}`);
    });
    
    // 执行状态转换：confirmed -> in_progress
    const [inProgressUpdatedCount] = await RoomReservation.update(
      { status: 'in_progress' },
      {
        where: {
          status: 'confirmed',
          start_time: { [Op.lte]: now }
        }
      }
    );
    
    console.log(`更新了 ${inProgressUpdatedCount} 条预约记录为 in_progress 状态`);
    
    // 2. 第二阶段：将已到结束时间的 in_progress 状态转换为 ended
    const inProgressToEnded = await RoomReservation.findAll({
      where: {
        status: 'in_progress',
        end_time: { [Op.lt]: now }
      },
      include: [{
        model: StudyRoom,
        attributes: ['name']
      }]
    });
    
    console.log(`找到 ${inProgressToEnded.length} 条已过期的 in_progress 状态预约`);
    inProgressToEnded.forEach((record: any) => {
      console.log(`准备转换: ID=${record.id}, 状态=in_progress, 结束时间=${record.end_time}, 自习室=${record.StudyRoom?.name}`);
    });
    
    // 执行状态转换：in_progress -> ended
    const [endedUpdatedCount] = await RoomReservation.update(
      { status: 'ended' },
      {
        where: {
          status: 'in_progress',
          end_time: { [Op.lt]: now }
        }
      }
    );
    
    console.log(`更新了 ${endedUpdatedCount} 条预约记录为 ended 状态`);
    
    // 3. 兼容旧数据：将已到结束时间的 confirmed 状态转换为 ended
    const confirmedToEnded = await RoomReservation.findAll({
      where: {
        status: 'confirmed',
        end_time: { [Op.lt]: now }
      },
      include: [{
        model: StudyRoom,
        attributes: ['name']
      }]
    });
    
    if (confirmedToEnded.length > 0) {
      console.log(`找到 ${confirmedToEnded.length} 条已过期的 confirmed 状态预约（兼容旧数据）`);
      confirmedToEnded.forEach((record: any) => {
        console.log(`准备转换: ID=${record.id}, 状态=confirmed, 结束时间=${record.end_time}, 自习室=${record.StudyRoom?.name}`);
      });
      
      // 执行状态转换：confirmed -> ended
      const [legacyUpdatedCount] = await RoomReservation.update(
        { status: 'ended' },
        {
          where: {
            status: 'confirmed',
            end_time: { [Op.lt]: now }
          }
        }
      );
      
      console.log(`更新了 ${legacyUpdatedCount} 条旧数据预约记录为 ended 状态`);
    }
    
    // 4. 删除超过一天的已结束预约
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
// 此函数已被 earlyExitReservation 替代，保留以兼容旧代码
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
    
    // 检查状态：只能在 confirmed 或 in_progress 状态下结束
    if (reservation.status !== 'confirmed' && reservation.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: "预约状态不允许结束操作" });
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

// 提前退出预约（用户主动提前结束预约）
// 可以在 confirmed 或 in_progress 状态下调用
export const earlyExitReservation = async (req: Request, res: Response) => {
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
    
    // 检查状态：只能在 confirmed 或 in_progress 状态下提前退出
    if (reservation.status !== 'confirmed' && reservation.status !== 'in_progress') {
      return res.status(400).json({ 
        success: false, 
        message: "只有已确认或已进入状态的预约才能提前退出" 
      });
    }
    
    // 更新预约状态为ended
    await reservation.update({ status: 'ended' });
    
    res.json({
      success: true,
      message: "提前退出成功",
      data: reservation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提前退出失败";
    res.status(500).json({ success: false, message });
  }
};

// 取消预约
// 只能在 confirmed 状态下取消（预约已确认但还未开始）
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
    
    // 检查状态：只能在 confirmed 状态下取消
    if (reservation.status !== 'confirmed') {
      if (reservation.status === 'in_progress') {
        return res.status(400).json({ 
          success: false, 
          message: "预约已开始，无法取消，请使用提前退出功能" 
        });
      }
      return res.status(400).json({ success: false, message: "预约状态不允许取消" });
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

// 原子化退出自习室并结束预约（合并为一个事务操作）
export const leaveAndEndReservation = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (!req.user) {
      await transaction.rollback();
      return res.status(401).json({ success: false, message: "未授权访问" });
    }
    
    const { reservationId } = req.body as { reservationId: number };
    
    // 1. 查找用户当前 active 状态的占用记录
    const occupancy = await RoomOccupancy.findOne({
      where: {
        user_id: req.user.id,
        status: 'active'
      },
      order: [['join_time', 'DESC']],
      transaction
    });
    
    if (!occupancy) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "您不在任何自习室中" 
      });
    }
    
    // 2. 查找预约记录
    const reservation = await RoomReservation.findByPk(reservationId, { transaction });
    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "预约记录不存在" });
    }
    
    // 检查是否是当前用户的预约
    if (reservation.user_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "无权限操作他人预约" });
    }
    
    // 3. 更新占用记录状态
    await occupancy.update({
      status: 'left',
      leave_time: new Date()
    }, { transaction });
    
    // 4. 更新预约记录状态（如果是 confirmed 或 in_progress 状态则更新为 ended）
    if (reservation.status === 'confirmed' || reservation.status === 'in_progress') {
      await reservation.update({ status: 'ended' }, { transaction });
    }
    
    // 提交事务
    await transaction.commit();
    
    res.json({
      success: true,
      message: "退出自习室并结束预约成功",
      data: {
        occupancy: occupancy.toJSON(),
        reservation: reservation.toJSON()
      }
    });
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    console.error('原子化退出自习室失败:', error);
    const message = error instanceof Error ? error.message : "退出失败";
    res.status(500).json({ success: false, message });
  }
};

// 获取每个自习室每个小时的已预约人数（用于时间轴视图）
export const getHourlyAvailability = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    
    // 确定查询的日期
    let queryDate: Date;
    if (date && typeof date === 'string') {
      queryDate = new Date(date);
    } else {
      queryDate = new Date();
    }
    
    // 构建当天的开始和结束时间
    const dayStart = new Date(queryDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(queryDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // 1. 获取所有活跃的自习室
    const rooms = await StudyRoom.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'capacity', 'location', 'image_url'],
      order: [['id', 'ASC']]
    });
    
    // 2. 获取当天所有已确认和已进入状态的预约（与当天有重叠的）
    const reservations = await RoomReservation.findAll({
      where: {
        status: { [Op.in]: ['confirmed', 'in_progress'] },
        [Op.or]: [
          // 预约完全在当天内
          {
            start_time: { [Op.gte]: dayStart },
            end_time: { [Op.lte]: dayEnd }
          },
          // 预约开始在前一天，结束在当天
          {
            start_time: { [Op.lt]: dayStart },
            end_time: { [Op.gt]: dayStart }
          },
          // 预约开始在当天，结束在后一天
          {
            start_time: { [Op.lt]: dayEnd },
            end_time: { [Op.gt]: dayEnd }
          }
        ]
      },
      attributes: ['id', 'room_id', 'start_time', 'end_time'],
      order: [['room_id', 'ASC'], ['start_time', 'ASC']]
    });
    
    // 3. 按房间分组预约
    const reservationsByRoom: Record<number, typeof reservations> = {};
    reservations.forEach((res: any) => {
      if (!reservationsByRoom[res.room_id]) {
        reservationsByRoom[res.room_id] = [];
      }
      reservationsByRoom[res.room_id].push(res);
    });
    
    // 4. 为每个房间计算每个小时的已预约人数
    const result = rooms.map((room: any) => {
      const roomReservations = reservationsByRoom[room.id] || [];
      
      // 初始化24小时的数据
      const hourlyData: { hour: number; reserved: number; available: number }[] = [];
      
      for (let hour = 0; hour < 24; hour++) {
        // 构建该小时的时间范围
        const hourStart = new Date(queryDate);
        hourStart.setHours(hour, 0, 0, 0);
        
        const hourEnd = new Date(queryDate);
        hourEnd.setHours(hour, 59, 59, 999);
        
        // 计算该小时内有多少个预约
        let reservedCount = 0;
        
        roomReservations.forEach((res: any) => {
          const resStart = new Date(res.start_time);
          const resEnd = new Date(res.end_time);
          
          // 检查预约时间段是否与该小时有重叠
          // 重叠条件：预约开始 < 小时结束 且 预约结束 > 小时开始
          if (resStart < hourEnd && resEnd > hourStart) {
            reservedCount++;
          }
        });
        
        hourlyData.push({
          hour,
          reserved: reservedCount,
          available: Math.max(0, room.capacity - reservedCount)
        });
      }
      
      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        image_url: room.image_url,
        hourlyData
      };
    });
    
    res.json({
      success: true,
      message: "获取成功",
      data: {
        date: queryDate.toISOString().split('T')[0],
        rooms: result
      }
    });
    
  } catch (error) {
    console.error('获取每小时可用状态失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};