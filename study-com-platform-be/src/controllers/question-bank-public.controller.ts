import { Request, Response } from "express";
import { Op } from "sequelize";
import Professional from "../models/professional.model";
import Category from "../models/category.model";
import QuestionBank from "../models/question-bank.model";

interface CategoryNode {
  id: number;
  professional_id: number;
  parent_id: number | null;
  name: string;
  description?: string;
  sort_order: number;
  children: CategoryNode[];
}

function buildTree(categories: any[], parentId: number | null = null): CategoryNode[] {
  return categories
    .filter((c) => (c.parent_id || null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      professional_id: c.professional_id,
      parent_id: c.parent_id || null,
      name: c.name,
      description: c.description,
      sort_order: c.sort_order,
      children: buildTree(categories, c.id),
    }));
}

function collectDescendantIds(categories: any[], parentId: number): number[] {
  const ids: number[] = [];
  const children = categories.filter((c) => c.parent_id === parentId);
  for (const child of children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(categories, child.id));
  }
  return ids;
}

export const getProfessionals = async (_req: Request, res: Response) => {
  try {
    const professionals = await Professional.findAll({
      where: { status: 1 },
      order: [["sort_order", "ASC"]],
      attributes: ["id", "name", "description", "sort_order"],
    });

    res.json({ success: true, data: professionals, message: "获取专业列表成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取专业列表失败" });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { professionalId } = req.query;

    if (!professionalId) {
      return res.status(400).json({ success: false, message: "缺少 professionalId 参数" });
    }

    const categories = await Category.findAll({
      where: { professional_id: Number(professionalId), status: 1 },
      order: [["sort_order", "ASC"]],
      attributes: ["id", "professional_id", "parent_id", "name", "description", "sort_order"],
    });

    const tree = buildTree(categories.map((c) => c.toJSON()));

    res.json({ success: true, data: tree, message: "获取分类树成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取分类树失败" });
  }
};

export const getBanks = async (req: Request, res: Response) => {
  try {
    const { categoryId, professionalId, keyword, bankId, page = "1", pageSize = "12" } = req.query;
    const pageNum = Math.max(1, Number(page));
    const size = Math.min(50, Math.max(1, Number(pageSize)));

    const where: any = { status: 1 };

    if (bankId) {
      where.id = Number(bankId);
    } else if (categoryId) {
      const allCategories = await Category.findAll({
        where: { status: 1 },
        attributes: ["id", "professional_id", "parent_id"],
        raw: true,
      });
      const descendantIds = collectDescendantIds(allCategories, Number(categoryId));
      descendantIds.push(Number(categoryId));
      where.category_id = { [Op.in]: descendantIds };
    } else if (professionalId) {
      const categoryIds = await Category.findAll({
        where: { professional_id: Number(professionalId), status: 1 },
        attributes: ["id"],
        raw: true,
      });
      if (categoryIds.length > 0) {
        where.category_id = { [Op.in]: categoryIds.map((c: any) => c.id) };
      } else {
        where.category_id = { [Op.in]: [-1] };
      }
    }

    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }

    const { count, rows } = await QuestionBank.findAndCountAll({
      where,
      order: [["question_count", "DESC"]],
      limit: size,
      offset: (pageNum - 1) * size,
      attributes: ["id", "name", "category_id", "description", "question_count", "difficulty", "rating"],
    });

    res.json({
      success: true,
      data: rows,
      message: "获取题库列表成功",
      pagination: { page: pageNum, pageSize: size, total: count },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取题库列表失败" });
  }
};
