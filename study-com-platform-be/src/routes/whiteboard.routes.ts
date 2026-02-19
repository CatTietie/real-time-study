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

export default router;
