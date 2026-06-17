import { Request, Response } from "express";
import CollaborativeNote from "../models/collaborative-note.model";

export const createNote = async (req: Request, res: Response) => {
  try {
    const { title, room_id } = req.body;
    const userId = (req as any).user.id;

    const note = await CollaborativeNote.create({
      title: title || "未命名文档",
      creator_id: userId,
      room_id: room_id || null,
    });

    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listNotes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, pageSize = 20, status = "active" } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);

    const { rows, count } = await CollaborativeNote.findAndCountAll({
      where: { creator_id: userId, status: status as string },
      order: [["updated_at", "DESC"]],
      limit: Number(pageSize),
      offset,
    });

    res.json({
      success: true,
      data: {
        list: rows,
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const note = await CollaborativeNote.findByPk(id, {
      attributes: { exclude: ["content_yjs"] },
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "笔记不存在" });
    }

    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;

    const note = await CollaborativeNote.findByPk(id);
    if (!note) {
      return res.status(404).json({ success: false, message: "笔记不存在" });
    }

    if (title !== undefined) note.title = title;
    if (status !== undefined) note.status = status;
    await note.save();

    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const note = await CollaborativeNote.findByPk(id);
    if (!note) {
      return res.status(404).json({ success: false, message: "笔记不存在" });
    }

    note.status = "archived";
    await note.save();

    res.json({ success: true, message: "已归档" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
