import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/rooms", chatController.createChatRoom);
router.get("/rooms", chatController.getChatRooms);
router.get("/messages/:roomId", chatController.getChatMessages);
router.get("/history/:roomId", chatController.getChatHistory);
router.get("/search/:roomId", chatController.searchChatMessages);
router.get("/online-users/:roomId", chatController.getOnlineUsers);
router.delete("/rooms/:roomId", chatController.deleteChatRoom);
router.post("/rooms/:roomId/leave", chatController.leaveChatRoom);
router.post("/rooms/:roomId/add-user", chatController.addUserToRoom);
router.get("/available-users/:roomId", chatController.getAvailableUsers);

export default router;
