import { Router } from "express";
import {
  getStudyRooms,
  getStudyRoomDetail,
  reserveStudyRoom,
  leaveStudyRoom,
  endReservation,
  earlyExitReservation,
  cancelReservation,
  getMyReservations,
  leaveAndEndReservation,
  getHourlyAvailability,
} from "../controllers/study-room.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { Op } from "sequelize";

const router = Router();

// 公开接口
router.get("/", getStudyRooms);
router.get("/:id", getStudyRoomDetail);
router.get("/hourly/availability", getHourlyAvailability);

// 需要认证的接口
router.use(authMiddleware);

router.post("/reserve", reserveStudyRoom);
router.post("/leave", leaveStudyRoom);
router.get("/my/reservations", getMyReservations);

// 预约操作接口
router.post("/reservations/end", endReservation);
router.post("/reservations/early-exit", earlyExitReservation);
router.post("/reservations/cancel", cancelReservation);
// 原子化退出自习室并结束预约
router.post("/reservations/leave-and-end", leaveAndEndReservation);

// 管理员接口
router.post("/check-expired", async (req, res) => {
  try {
    const { checkExpiredReservations } = await import('../controllers/study-room.controller');
    await checkExpiredReservations();
    res.json({ success: true, message: "状态检查完成" });
  } catch (error) {
    res.status(500).json({ success: false, message: "检查失败" });
  }
});

// 强制更新过期状态接口（支持新的状态 in_progress）
router.post("/force-update-expired", async (req, res) => {
  try {
    const { RoomReservation } = await import('../models/room-reservation.model');
    const { sequelize } = await import('../config/sequelize');
    const now = new Date();
    
    console.log(`强制更新过期状态，当前时间: ${now.toISOString()}`);
    
    // 首先尝试修复数据库表结构（添加 in_progress 状态）
    try {
      await sequelize.query("ALTER TABLE room_reservations MODIFY COLUMN status ENUM('confirmed', 'in_progress', 'ended', 'cancelled') DEFAULT 'confirmed';");
      console.log('数据库表结构更新完成（添加 in_progress 状态）');
    } catch (schemaError: any) {
      console.log('表结构已是最新的或修复失败:', schemaError.message || schemaError);
    }
    
    // 1. 第一阶段：将已到开始时间的 confirmed 状态转换为 in_progress
    const [inProgressUpdatedCount] = await RoomReservation.update(
      { status: 'in_progress' },
      {
        where: {
          status: 'confirmed',
          start_time: { [Op.lte]: now }
        }
      }
    );
    
    console.log(`已将 ${inProgressUpdatedCount} 条 confirmed 记录转换为 in_progress`);
    
    // 2. 第二阶段：将已到结束时间的 in_progress 状态转换为 ended
    const [endedUpdatedCount] = await RoomReservation.update(
      { status: 'ended' },
      {
        where: {
          status: 'in_progress',
          end_time: { [Op.lt]: now }
        }
      }
    );
    
    console.log(`已将 ${endedUpdatedCount} 条 in_progress 记录转换为 ended`);
    
    // 3. 兼容旧数据：将已到结束时间的 confirmed 状态转换为 ended
    const [legacyUpdatedCount] = await RoomReservation.update(
      { status: 'ended' },
      {
        where: {
          status: 'confirmed',
          end_time: { [Op.lt]: now }
        }
      }
    );
    
    const totalUpdated = inProgressUpdatedCount + endedUpdatedCount + legacyUpdatedCount;
    
    console.log(`总计更新了 ${totalUpdated} 条记录`);
    
    res.json({ 
      success: true, 
      message: `强制更新完成，共更新 ${totalUpdated} 条记录`,
      details: {
        confirmedToInProgress: inProgressUpdatedCount,
        inProgressToEnded: endedUpdatedCount,
        confirmedToEnded: legacyUpdatedCount
      }
    });
  } catch (error: any) {
    console.error('强制更新失败:', error);
    res.status(500).json({ success: false, message: "强制更新失败: " + (error.message || error) });
  }
});

export default router;