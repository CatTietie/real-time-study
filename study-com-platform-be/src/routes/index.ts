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
import userManagementRoutes from "./user-management.routes";  // 用户管理
import notificationRoutes from "./notification.routes";  // 通知路由
import questionBankPublicRoutes from "./question-bank-public.routes";
import collaborativeNoteRoutes from "./collaborative-note.routes";
import recommendationRoutes from "./recommendation.routes";
import learningPathRoutes from "./learning-path.routes";
import aiAssistantRoutes from "./ai-assistant.routes";
import videoStudyRoomRoutes from "./video-study-room.routes";
import codeProblemStudentRoutes from "./code-problem-student.routes";
import knowledgeLibraryRoutes from "./knowledge-library.routes";
import mallRoutes from "./mall.routes";

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
router.use("/user-management", userManagementRoutes);  // 用户管理
router.use("/notifications", notificationRoutes);  // 通知路由
router.use("/question-bank", questionBankPublicRoutes);  // 题库公开接口
router.use("/collaborative-notes", collaborativeNoteRoutes);  // 协作笔记
router.use("/recommendations", recommendationRoutes);  // 个性化推荐
router.use("/learning-paths", learningPathRoutes);  // 学习路径技能树
router.use("/ai-assistant", aiAssistantRoutes);  // AI 学习助手
router.use("/video-study-rooms", videoStudyRoomRoutes);  // 视频自习室
router.use("/code-problems", codeProblemStudentRoutes);  // 编程题库
router.use("/knowledge-library", knowledgeLibraryRoutes);  // 知识文库
router.use("/mall", mallRoutes);  // 积分商城

export default router;
