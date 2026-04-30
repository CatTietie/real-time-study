import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", notificationController.getUserNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/:id/mark-read", notificationController.markNotificationAsRead);
router.post("/mark-all-read", notificationController.markAllAsRead);
router.delete("/:id", notificationController.deleteNotification);

export default router;
