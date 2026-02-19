// 路由总入口
import { Router } from "express";
import adminRoutes from "./admin.routes";
import userRoutes from "./user.routes";
import postRoutes from "./post.routes";
import dashboardRoutes from "./dashboard.routes";
import communityRoutes from "./community.routes";
import learningGoalRoutes from "./learning-goal.routes";
import studyRoomRoutes from "./study-room.routes";
import chatRoutes from "./chat.routes";  // 新增
import whiteboardRoutes from "./whiteboard.routes";  // 新增

const router = Router();

router.use("/admin", adminRoutes);
router.use("/user", userRoutes);
router.use("/post", postRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/community", communityRoutes);
router.use("/learning-goals", learningGoalRoutes);
router.use("/study-rooms", studyRoomRoutes);
router.use("/chat", chatRoutes);  // 新增
router.use("/whiteboard", whiteboardRoutes);  // 新增

export default router;
