// 仪表板路由
import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, dashboardController.getDashboard);

export default router;
