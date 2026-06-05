import { Request, Response } from "express";
import DocumentAnnotation from "../models/document-annotation.model";
import User from "../models/user.model";
import { getSocketIo } from "../utils/socketManager";
import { broadcastAnnotationEvent } from "../services/knowledge-realtime.service";

export const listAnnotations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page_number, status } = req.query;

    const where: any = { document_id: Number(id), parent_id: null };
    if (page_number) where.page_number = Number(page_number);
    if (status) where.status = status;

    const annotations = await DocumentAnnotation.findAll({
      where,
      include: [
        { model: User, as: "Author", attributes: ["id", "username", "nickname", "avatar"] },
        {
          model: DocumentAnnotation,
          as: "Replies",
          include: [
            { model: User, as: "Author", attributes: ["id", "username", "nickname", "avatar"] },
          ],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    res.json({ success: true, data: annotations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取批注失败" });
  }
};

export const createAnnotation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, page_number, position_x, position_y, highlight_rects, quoted_text, parent_id } = req.body;
    const userId = (req as any).user.id;

    if (!content || page_number === undefined || position_x === undefined || position_y === undefined) {
      return res.status(400).json({ success: false, message: "缺少必要参数" });
    }

    const annotation = await DocumentAnnotation.create({
      document_id: Number(id),
      user_id: userId,
      content,
      page_number: Number(page_number),
      position_x: Number(position_x),
      position_y: Number(position_y),
      highlight_rects: highlight_rects ? JSON.stringify(highlight_rects) : null,
      quoted_text: quoted_text || null,
      parent_id: parent_id ? Number(parent_id) : null,
    });

    const fullAnnotation = await DocumentAnnotation.findByPk(annotation.id, {
      include: [
        { model: User, as: "Author", attributes: ["id", "username", "nickname", "avatar"] },
      ],
    });

    const io = getSocketIo();
    if (io) {
      broadcastAnnotationEvent(io, Number(id), "annotation_added", fullAnnotation);
    }

    res.status(201).json({ success: true, data: fullAnnotation, message: "批注创建成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "创建批注失败" });
  }
};

export const resolveAnnotation = async (req: Request, res: Response) => {
  try {
    const { id, aid } = req.params;

    const annotation = await DocumentAnnotation.findOne({
      where: { id: Number(aid), document_id: Number(id) },
    });

    if (!annotation) {
      return res.status(404).json({ success: false, message: "批注不存在" });
    }

    await annotation.update({ status: "resolved" });

    const io = getSocketIo();
    if (io) {
      broadcastAnnotationEvent(io, Number(id), "annotation_resolved", { annotationId: Number(aid) });
    }

    res.json({ success: true, message: "批注已标记为已解决" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "操作失败" });
  }
};

export const deleteAnnotation = async (req: Request, res: Response) => {
  try {
    const { id, aid } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const annotation = await DocumentAnnotation.findOne({
      where: { id: Number(aid), document_id: Number(id) },
    });

    if (!annotation) {
      return res.status(404).json({ success: false, message: "批注不存在" });
    }

    if (annotation.user_id !== userId && userRole !== "admin" && userRole !== "super_admin") {
      return res.status(403).json({ success: false, message: "无权删除他人批注" });
    }

    await DocumentAnnotation.destroy({ where: { parent_id: Number(aid) } });
    await annotation.destroy();

    const io = getSocketIo();
    if (io) {
      broadcastAnnotationEvent(io, Number(id), "annotation_deleted", { annotationId: Number(aid) });
    }

    res.json({ success: true, message: "批注已删除" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "删除失败" });
  }
};
