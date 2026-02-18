import { Router } from "express";
import {
  getStudyRooms,
  getStudyRoomDetail,
  reserveStudyRoom,
  joinStudyRoom,
  leaveStudyRoom,
  confirmReservation,
  completeReservation,
  cancelReservation,
  getMyReservations,
} from "../controllers/study-room.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// 公开接口
router.get("/", getStudyRooms);
router.get("/:id", getStudyRoomDetail);

// 需要认证的接口
router.use(authMiddleware);

router.post("/reserve", reserveStudyRoom);
router.post("/join", joinStudyRoom);
router.post("/leave", leaveStudyRoom);
router.get("/my/reservations", getMyReservations);

// 预约操作接口
router.post("/reservations/confirm", confirmReservation);
router.post("/reservations/complete", completeReservation);
router.post("/reservations/cancel", cancelReservation);

export default router;