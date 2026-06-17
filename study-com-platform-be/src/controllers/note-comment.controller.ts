import { Request, Response } from "express";
import NoteComment from "../models/note-comment.model";
import User from "../models/user.model";
import { getSocketIo } from "../utils/socketManager";

export const listComments = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const status = (req.query.status as string) || "active";

    const comments = await NoteComment.findAll({
      where: { note_id: noteId, status, parent_id: null },
      include: [
        { model: User, attributes: ["id", "username", "nickname", "avatar"] },
        {
          model: NoteComment,
          as: "Replies",
          include: [{ model: User, attributes: ["id", "username", "nickname", "avatar"] }],
          separate: true,
          order: [["created_at", "ASC"]],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, message: "获取评论列表成功", data: comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取评论列表失败";
    res.status(500).json({ success: false, message });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const userId = (req as any).user?.id;
    const { content, position_start, position_end, quoted_text, parent_id } = req.body;

    if (!content || !position_start || !position_end) {
      return res.status(400).json({ success: false, message: "缺少必填字段" });
    }

    const comment = await NoteComment.create({
      note_id: noteId,
      user_id: userId,
      content,
      position_start,
      position_end,
      quoted_text: quoted_text || null,
      parent_id: parent_id || null,
    });

    // Reload with user info
    const fullComment = await NoteComment.findByPk(comment.id, {
      include: [{ model: User, attributes: ["id", "username", "nickname", "avatar"] }],
    });

    // Emit real-time event
    const io = getSocketIo();
    if (io) {
      io.to(`note_${noteId}`).emit("note_comment_added", fullComment);
    }

    res.status(201).json({ success: true, message: "评论添加成功", data: fullComment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加评论失败";
    res.status(500).json({ success: false, message });
  }
};

export const resolveComment = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const commentId = Number(req.params.commentId);

    const comment = await NoteComment.findByPk(commentId);
    if (!comment || comment.note_id !== noteId) {
      return res.status(404).json({ success: false, message: "评论不存在" });
    }

    await comment.update({ status: "resolved" });

    const io = getSocketIo();
    if (io) {
      io.to(`note_${noteId}`).emit("note_comment_resolved", { commentId });
    }

    res.json({ success: true, message: "评论已标记为已解决" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新评论状态失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const noteId = Number(req.params.noteId);
    const commentId = Number(req.params.commentId);

    const comment = await NoteComment.findByPk(commentId);
    if (!comment || comment.note_id !== noteId) {
      return res.status(404).json({ success: false, message: "评论不存在" });
    }

    await comment.destroy();

    const io = getSocketIo();
    if (io) {
      io.to(`note_${noteId}`).emit("note_comment_deleted", { commentId });
    }

    res.json({ success: true, message: "评论已删除" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除评论失败";
    res.status(500).json({ success: false, message });
  }
};
