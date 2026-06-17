import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { uploadRecordingFile } from "../middlewares/upload.middleware";
import {
  createVideoStudyRoom,
  getVideoStudyRooms,
  getVideoStudyRoomDetail,
  closeVideoStudyRoom,
  updateVideoStudyRoomConfig,
  uploadRecording,
  getRoomRecordings,
  deleteRecording,
} from "../controllers/video-study-room.controller";

const router = Router();

router.get("/", getVideoStudyRooms);
router.get("/:id", getVideoStudyRoomDetail);
router.get("/:roomId/recordings", getRoomRecordings);

router.use(authMiddleware);
router.post("/", createVideoStudyRoom);
router.post("/:id/close", closeVideoStudyRoom);
router.patch("/:id/config", updateVideoStudyRoomConfig);
router.post("/:roomId/recordings/upload", uploadRecordingFile.single("file"), uploadRecording);
router.delete("/recordings/:recordingId", deleteRecording);

export default router;
