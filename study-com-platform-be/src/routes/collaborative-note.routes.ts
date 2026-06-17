import { Router } from "express";
import {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
} from "../controllers/collaborative-note.controller";
import {
  listVersions,
  getVersion,
  restoreVersion,
  createManualVersion,
} from "../controllers/note-version.controller";
import {
  listComments,
  createComment,
  resolveComment,
  deleteComment,
} from "../controllers/note-comment.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", createNote);
router.get("/", listNotes);
router.get("/:id", getNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

// 版本管理
router.get("/:noteId/versions", listVersions);
router.post("/:noteId/versions", createManualVersion);
router.get("/:noteId/versions/:versionId", getVersion);
router.post("/:noteId/versions/:versionId/restore", restoreVersion);

// 行级评论
router.get("/:noteId/comments", listComments);
router.post("/:noteId/comments", createComment);
router.patch("/:noteId/comments/:commentId", resolveComment);
router.delete("/:noteId/comments/:commentId", deleteComment);

export default router;
