// 敏感词库控制器
import { Request, Response } from "express";
import { Op, Sequelize } from "sequelize";
import SensitiveWord from "../models/sensitive-word.model";
import { clearSensitiveWordCache } from "../services/sensitive-word.service";

export const getSensitiveWords = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, status, level } = req.query;

    const where: any = {};
    if (keyword) {
      where.word = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== "") {
      where.status = Number(status);
    }
    if (level !== undefined && level !== "") {
      where.level = Number(level);
    }

    const result = await SensitiveWord.findAndCountAll({
      where,
      order: [[Sequelize.col("created_at"), "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
    });

    res.json({
      success: true,
      message: "获取敏感词成功",
      data: result.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: result.count,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取敏感词失败";
    res.status(500).json({ success: false, message });
  }
};

export const createSensitiveWord = async (req: Request, res: Response) => {
  try {
    const {
      word,
      category,
      level = 1,
      status = 1,
    } = req.body as {
      word?: string;
      category?: string;
      level?: number;
      status?: number;
    };

    if (!word || !word.trim()) {
      return res.status(400).json({ success: false, message: "词条不能为空" });
    }

    const existing = await SensitiveWord.findOne({
      where: { word: word.trim() },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "词条已存在" });
    }

    const created = await SensitiveWord.create({
      word: word.trim(),
      category,
      level: Number(level) || 1,
      status: Number(status) ? 1 : 0,
    });

    clearSensitiveWordCache();

    res.json({ success: true, message: "创建成功", data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateSensitiveWord = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { word, category, level, status } = req.body as {
      word?: string;
      category?: string;
      level?: number;
      status?: number;
    };

    const existing = await SensitiveWord.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "词条不存在" });
    }

    if (word && word.trim() && word.trim() !== existing.word) {
      const duplicate = await SensitiveWord.findOne({
        where: { word: word.trim(), id: { [Op.ne]: id } },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "词条已存在" });
      }
    }

    await existing.update({
      word: word ? word.trim() : existing.word,
      category: category ?? existing.category,
      level: level !== undefined ? Number(level) || 1 : existing.level,
      status: status !== undefined ? (Number(status) ? 1 : 0) : existing.status,
    });

    clearSensitiveWordCache();

    res.json({ success: true, message: "更新成功", data: existing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};

export const deleteSensitiveWord = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await SensitiveWord.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "词条不存在" });
    }

    await existing.destroy();
    clearSensitiveWordCache();

    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateSensitiveWordStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: number };

    const existing = await SensitiveWord.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "词条不存在" });
    }

    await existing.update({ status: Number(status) ? 1 : 0 });
    clearSensitiveWordCache();

    res.json({ success: true, message: "更新成功", data: existing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    res.status(500).json({ success: false, message });
  }
};
