import { Router } from "express";
import {
  getStudyRooms,
  getStudyRoomDetail,
  reserveStudyRoom,
  joinStudyRoom,
  leaveStudyRoom,
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

export default router;