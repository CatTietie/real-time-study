import { Router } from "express";
import * as whiteboardController from "../controllers/whiteboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", whiteboardController.createWhiteboard);
router.get("/:id", whiteboardController.getWhiteboard);
router.get("/actions/:whiteboardId", whiteboardController.getWhiteboardActions);
router.post("/clear/:whiteboardId", whiteboardController.clearWhiteboard);
router.get("/export/:whiteboardId", whiteboardController.exportWhiteboardToPng);

// 白板快照相关路由
router.post("/snapshot/:whiteboardId", whiteboardController.saveWhiteboardSnapshot);
router.get("/snapshots/:whiteboardId", whiteboardController.getWhiteboardSnapshots);
router.get("/snapshot/load/:snapshotId", whiteboardController.loadWhiteboardSnapshot);
// 获取聊天室白板快照
router.get("/chat-room/:roomId/snapshots", whiteboardController.getChatRoomWhiteboardSnapshots);

export default router;
