import { Router } from "express";
import { authMiddleware, requirePermission } from "../middlewares/auth.middleware";
import { requireDocumentPermission } from "../middlewares/document-permission.middleware";
import { uploadKnowledgeFile } from "../middlewares/upload.middleware";
import * as docCtrl from "../controllers/knowledge-document.controller";
import * as annotCtrl from "../controllers/knowledge-annotation.controller";
import * as verCtrl from "../controllers/knowledge-version.controller";
import * as permCtrl from "../controllers/document-permission.controller";

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

// 文档权限管理（需在 /:id 通用路由之前注册）
router.get("/:id/permissions/me", requireDocumentPermission("view"), permCtrl.getMyPermission);
router.get("/:id/permissions", requireDocumentPermission("manage"), permCtrl.listPermissions);
router.post("/:id/permissions", requireDocumentPermission("manage"), permCtrl.grantPermission);
router.put("/:id/permissions", requireDocumentPermission("manage"), permCtrl.batchSetPermissions);
router.delete("/:id/permissions/:pid", requireDocumentPermission("manage"), permCtrl.revokePermission);

// 文档详情
router.get("/:id", requireDocumentPermission("view"), docCtrl.getDocument);

// 文档下载
router.get("/:id/download", requireDocumentPermission("view"), docCtrl.downloadDocument);

// 版本管理
router.get("/:id/versions", requireDocumentPermission("view"), verCtrl.listVersions);
router.get("/:id/versions/:vid", requireDocumentPermission("view"), verCtrl.getVersion);
router.post(
  "/:id/versions",
  requireDocumentPermission("edit"),
  uploadKnowledgeFile.single("file"),
  verCtrl.uploadNewVersion
);
router.post(
  "/:id/versions/:vid/restore",
  requireDocumentPermission("edit"),
  verCtrl.restoreVersion
);

// 批注管理
router.get("/:id/annotations", requireDocumentPermission("view"), annotCtrl.listAnnotations);
router.post("/:id/annotations", requireDocumentPermission("comment"), annotCtrl.createAnnotation);
router.patch("/:id/annotations/:aid", requireDocumentPermission("comment"), annotCtrl.resolveAnnotation);
router.delete("/:id/annotations/:aid", requireDocumentPermission("comment"), annotCtrl.deleteAnnotation);

export default router;
