import { Router } from "express";
import { authMiddleware, requirePermission } from "../middlewares/auth.middleware";
import { uploadKnowledgeFile } from "../middlewares/upload.middleware";
import * as docCtrl from "../controllers/knowledge-document.controller";
import * as annotCtrl from "../controllers/knowledge-annotation.controller";
import * as verCtrl from "../controllers/knowledge-version.controller";

const router = Router();

// 所有路由需登录
router.use(authMiddleware);

// 分类列表（公开）
router.get("/categories", docCtrl.getCategories);

// 文档搜索
router.get("/search", docCtrl.searchDocuments);

// 文档列表
router.get("/", docCtrl.listDocuments);

// 上传文档（需要 knowledge.upload 权限）
router.post(
  "/",
  requirePermission("knowledge.upload"),
  uploadKnowledgeFile.single("file"),
  docCtrl.uploadDocument
);

// 文档详情
router.get("/:id", docCtrl.getDocument);

// 文档下载
router.get("/:id/download", docCtrl.downloadDocument);

// 版本管理
router.get("/:id/versions", verCtrl.listVersions);
router.get("/:id/versions/:vid", verCtrl.getVersion);
router.post(
  "/:id/versions",
  requirePermission("knowledge.upload"),
  uploadKnowledgeFile.single("file"),
  verCtrl.uploadNewVersion
);
router.post(
  "/:id/versions/:vid/restore",
  requirePermission("knowledge.upload"),
  verCtrl.restoreVersion
);

// 批注管理
router.get("/:id/annotations", annotCtrl.listAnnotations);
router.post("/:id/annotations", annotCtrl.createAnnotation);
router.patch("/:id/annotations/:aid", annotCtrl.resolveAnnotation);
router.delete("/:id/annotations/:aid", annotCtrl.deleteAnnotation);

export default router;
