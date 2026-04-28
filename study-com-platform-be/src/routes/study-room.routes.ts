import { Router } from "express";
import {
  getStudyRooms,
  getStudyRoomDetail,
  reserveStudyRoom,
  leaveStudyRoom,
  confirmReservation,
  completeReservation,
  endReservation,
  cancelReservation,
  getMyReservations,
  leaveAndEndReservation,
} from "../controllers/study-room.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { Op } from "sequelize";

const router = Router();

// 公开接口
router.get("/", getStudyRooms);
router.get("/:id", getStudyRoomDetail);

// 需要认证的接口
router.use(authMiddleware);

router.post("/reserve", reserveStudyRoom);
router.post("/leave", leaveStudyRoom);
router.get("/my/reservations", getMyReservations);

// 预约操作接口
router.post("/reservations/confirm", confirmReservation);
router.post("/reservations/complete", completeReservation);
router.post("/reservations/end", endReservation);
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

// 强制更新过期状态接口（临时解决方案）
router.post("/force-update-expired", async (req, res) => {
  try {
    const { RoomReservation } = await import('../models/room-reservation.model');
    const { sequelize } = await import('../config/sequelize');
    const now = new Date();
    
    console.log(`强制更新过期状态，当前时间: ${now.toISOString()}`);
    
    // 首先尝试修复数据库表结构（移除pending和completed状态）
    try {
      await sequelize.query("ALTER TABLE room_reservations MODIFY COLUMN status ENUM('confirmed', 'cancelled', 'ended') DEFAULT 'confirmed';");
      console.log('数据库表结构修复完成');
    } catch (schemaError: any) {
      console.log('表结构已是最新的或修复失败:', schemaError.message || schemaError);
    }
    
    // 强制将所有已过结束时间且状态为confirmed的记录更新为ended
    const [updatedCount] = await RoomReservation.update(
      { status: 'ended' },
      {
        where: {
          status: 'confirmed',
          end_time: { [Op.lt]: now }
        }
      }
    );
    
    console.log(`强制更新了 ${updatedCount} 条记录`);
    
    res.json({ 
      success: true, 
      message: `强制更新完成，共更新 ${updatedCount} 条记录` 
    });
  } catch (error: any) {
    console.error('强制更新失败:', error);
    res.status(500).json({ success: false, message: "强制更新失败: " + (error.message || error) });
  }
});

export default router;