import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/rooms", chatController.createChatRoom);
router.get("/rooms", chatController.getChatRooms);
router.get("/messages/:roomId", chatController.getChatMessages);

export default router;
