import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import RoomReservation from "../models/room-reservation.model";
import StudyRoom from "../models/study-room.model";
import {
  getAllLearningStats,
  getStudyDuration,
  getLoginStreak,
  getContentQualityScore,
  getDailyRecords,
  type LearningStatsCardData,
  type DailyStudyRecord
} from "../services/learning-stats.service";

interface DailyDuration {
  date: string;
  duration: number;
}

interface RoomUsage {
  roomId: number;
  roomName: string;
  duration: number;
  count: number;
}

interface StudyStats {
  totalDuration: number;
  totalSessions: number;
  dailyDurations: DailyDuration[];
  roomUsages: RoomUsage[];
}

export const getStudyStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { month, year } = req.query;
    
    const now = new Date();
    const targetYear = year ? parseInt(year as string) : now.getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const endedReservations = await RoomReservation.findAll({
      where: {
        user_id: req.user.id,
        status: 'ended',
        start_time: {
          [Op.gte]: monthStart
        },
        end_time: {
          [Op.lte]: monthEnd
        }
      },
      include: [{
        model: StudyRoom,
        attributes: ['id', 'name']
      }],
      order: [['start_time', 'ASC']]
    });

    let totalDuration = 0;
    const dailyMap = new Map<string, number>();
    const roomMap = new Map<number, { name: string; duration: number; count: number }>();

    endedReservations.forEach((res: any) => {
      const startTime = new Date(res.start_time);
      const endTime = new Date(res.end_time);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

      if (duration > 0) {
        totalDuration += duration;

        const dateKey = startTime.toISOString().split('T')[0];
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + duration);

        const roomId = res.room_id;
        const roomName = res.StudyRoom?.name || `自习室 ${roomId}`;
        if (!roomMap.has(roomId)) {
          roomMap.set(roomId, { name: roomName, duration: 0, count: 0 });
        }
        const roomData = roomMap.get(roomId)!;
        roomData.duration += duration;
        roomData.count += 1;
      }
    });

    const dailyDurations: DailyDuration[] = [];
    const daysInMonth = monthEnd.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dateKey = date.toISOString().split('T')[0];
      dailyDurations.push({
        date: dateKey,
        duration: dailyMap.get(dateKey) || 0
      });
    }

    const roomUsages: RoomUsage[] = Array.from(roomMap.entries())
      .map(([roomId, data]) => ({
        roomId,
        roomName: data.name,
        duration: data.duration,
        count: data.count
      }))
      .sort((a, b) => b.duration - a.duration);

    const stats: StudyStats = {
      totalDuration,
      totalSessions: endedReservations.length,
      dailyDurations,
      roomUsages
    };

    res.json({
      success: true,
      message: "获取学习统计成功",
      data: stats
    });
  } catch (error) {
    console.error('获取学习统计失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getOverallStudyStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const endedReservations = await RoomReservation.findAll({
      where: {
        user_id: req.user.id,
        status: 'ended'
      },
      include: [{
        model: StudyRoom,
        attributes: ['id', 'name']
      }],
      order: [['start_time', 'ASC']]
    });

    let totalDuration = 0;
    const roomMap = new Map<number, { name: string; duration: number; count: number }>();

    endedReservations.forEach((res: any) => {
      const startTime = new Date(res.start_time);
      const endTime = new Date(res.end_time);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

      if (duration > 0) {
        totalDuration += duration;

        const roomId = res.room_id;
        const roomName = res.StudyRoom?.name || `自习室 ${roomId}`;
        if (!roomMap.has(roomId)) {
          roomMap.set(roomId, { name: roomName, duration: 0, count: 0 });
        }
        const roomData = roomMap.get(roomId)!;
        roomData.duration += duration;
        roomData.count += 1;
      }
    });

    const roomUsages: RoomUsage[] = Array.from(roomMap.entries())
      .map(([roomId, data]) => ({
        roomId,
        roomName: data.name,
        duration: data.duration,
        count: data.count
      }))
      .sort((a, b) => b.duration - a.duration);

    res.json({
      success: true,
      message: "获取总体学习统计成功",
      data: {
        totalDuration,
        totalSessions: endedReservations.length,
        roomUsages
      }
    });
  } catch (error) {
    console.error('获取总体学习统计失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getLearningStatsCards = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const stats = await getAllLearningStats(req.user.id);

    res.json({
      success: true,
      message: "获取学习统计成功",
      data: stats
    });
  } catch (error) {
    console.error('获取学习统计失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getStudyDurationDetail = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const duration = await getStudyDuration(req.user.id);

    res.json({
      success: true,
      message: "获取学习时长成功",
      data: duration
    });
  } catch (error) {
    console.error('获取学习时长失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getLoginStreakDetail = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const streak = await getLoginStreak(req.user.id);

    res.json({
      success: true,
      message: "获取连续登录天数成功",
      data: streak
    });
  } catch (error) {
    console.error('获取连续登录天数失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getContentQualityDetail = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const quality = await getContentQualityScore(req.user.id);

    res.json({
      success: true,
      message: "获取内容质量分成功",
      data: quality
    });
  } catch (error) {
    console.error('获取内容质量分失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};

export const getDailyStudyRecords = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { days = 7 } = req.query;
    const daysNum = parseInt(String(days)) || 7;

    const records = await getDailyRecords(req.user.id, daysNum);

    res.json({
      success: true,
      message: "获取每日学习记录成功",
      data: records
    });
  } catch (error) {
    console.error('获取每日学习记录失败:', error);
    const message = error instanceof Error ? error.message : "获取失败";
    res.status(500).json({ success: false, message });
  }
};
