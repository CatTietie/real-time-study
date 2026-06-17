import { Router } from "express";
import { authMiddleware, adminMiddleware, requirePermission } from "../middlewares/auth.middleware";
import * as adminCtrl from "../controllers/learning-path.controller";
import * as publicCtrl from "../controllers/learning-path-public.controller";

const router = Router();

// === 管理端路由 ===
router.get("/admin/paths", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.getPaths);
router.post("/admin/paths", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.createPath);
router.get("/admin/paths/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.getPathById);
router.put("/admin/paths/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.updatePath);
router.delete("/admin/paths/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.deletePath);
router.patch("/admin/paths/:id/status", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.updatePathStatus);
router.put("/admin/paths/:id/tree", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.saveTree);

router.post("/admin/nodes", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.createNode);
router.put("/admin/nodes/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.updateNode);
router.delete("/admin/nodes/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.deleteNode);
router.put("/admin/nodes/batch", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.batchUpdateNodes);

router.post("/admin/edges", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.createEdge);
router.delete("/admin/edges/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.deleteEdge);

router.post("/admin/nodes/:nodeId/resources", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.addNodeResource);
router.put("/admin/resources/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.updateNodeResource);
router.delete("/admin/resources/:id", authMiddleware, adminMiddleware, requirePermission("learning_path.manage"), adminCtrl.deleteNodeResource);

// === 学生端路由 ===
router.get("/published", authMiddleware, publicCtrl.getPublishedPaths);
router.get("/my-paths", authMiddleware, publicCtrl.getMyPaths);
router.post("/enroll/:pathId", authMiddleware, publicCtrl.enrollInPath);
router.get("/:pathId/tree", authMiddleware, publicCtrl.getPathTree);
router.get("/nodes/:nodeId/resources", authMiddleware, publicCtrl.getNodeResources);
router.post("/abandon/:pathId", authMiddleware, publicCtrl.abandonPath);

export default router;
