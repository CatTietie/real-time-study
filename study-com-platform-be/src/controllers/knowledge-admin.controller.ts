import { Request, Response } from "express";
import KnowledgeCategory from "../models/knowledge-category.model";
import KnowledgeDocument from "../models/knowledge-document.model";
import User from "../models/user.model";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";

// ===== 分类管理 =====

export const adminListCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await KnowledgeCategory.findAll({
      order: [["sort_order", "ASC"], ["created_at", "ASC"]],
    });

    const buildTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter((item) => item.parent_id === parentId)
        .map((item) => ({
          ...item.toJSON(),
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(categories);
    res.json({ success: true, data: tree });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取分类列表失败" });
  }
};

export const adminCreateCategory = async (req: Request, res: Response) => {
  try {
    const { name, parent_id, description, sort_order, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "分类名称不能为空" });
    }

    const category = await KnowledgeCategory.create({
      name,
      parent_id: parent_id || null,
      description: description || null,
      sort_order: sort_order || 0,
      icon: icon || null,
    });

    res.status(201).json({ success: true, data: category, message: "分类创建成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "创建分类失败" });
  }
};

export const adminUpdateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description, sort_order, icon, status } = req.body;

    const category = await KnowledgeCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "分类不存在" });
    }

    await category.update({
      ...(name !== undefined && { name }),
      ...(parent_id !== undefined && { parent_id: parent_id || null }),
      ...(description !== undefined && { description }),
      ...(sort_order !== undefined && { sort_order }),
      ...(icon !== undefined && { icon }),
      ...(status !== undefined && { status }),
    });

    res.json({ success: true, data: category, message: "分类更新成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "更新分类失败" });
  }
};

export const adminDeleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const childCount = await KnowledgeCategory.count({ where: { parent_id: Number(id) } });
    if (childCount > 0) {
      return res.status(400).json({ success: false, message: "该分类下有子分类，无法删除" });
    }

    const docCount = await KnowledgeDocument.count({ where: { category_id: Number(id) } });
    if (docCount > 0) {
      return res.status(400).json({ success: false, message: "该分类下有文档，请先移动文档后再删除" });
    }

    await KnowledgeCategory.destroy({ where: { id: Number(id) } });
    res.json({ success: true, message: "分类删除成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "删除分类失败" });
  }
};

// ===== 文档审核管理 =====

export const adminListDocuments = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, category_id, file_type, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    if (status) where.status = status;
    if (category_id) {
      if (category_id === "pending") {
        where.category_id = null;
      } else {
        where.category_id = Number(category_id);
      }
    }
    if (file_type) where.file_type = file_type;
    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { original_filename: { [Op.like]: `%${keyword}%` } },
        { tags: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const { rows, count } = await KnowledgeDocument.findAndCountAll({
      where,
      include: [
        { model: User, as: "Uploader", attributes: ["id", "username", "nickname", "avatar"] },
        { model: KnowledgeCategory, as: "Category", attributes: ["id", "name"] },
      ],
      order: [["created_at", "DESC"]],
      limit: Number(pageSize),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(count / Number(pageSize)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取文档列表失败" });
  }
};

export const adminAuditDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "无效的审核状态" });
    }

    const document = await KnowledgeDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, message: "文档不存在" });
    }

    await document.update({ status, reject_reason: status === "rejected" ? (reason || null) : null });

    res.json({ success: true, message: status === "approved" ? "文档已通过审核" : "文档已驳回" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "审核操作失败" });
  }
};

export const adminBatchMoveDocuments = async (req: Request, res: Response) => {
  try {
    const { document_ids, category_id } = req.body;

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({ success: false, message: "请选择要移动的文档" });
    }

    await KnowledgeDocument.update(
      { category_id: category_id || null },
      { where: { id: { [Op.in]: document_ids } } }
    );

    res.json({ success: true, message: `已移动 ${document_ids.length} 个文档` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "批量移动失败" });
  }
};

export const adminBatchDeleteDocuments = async (req: Request, res: Response) => {
  try {
    const { document_ids } = req.body;

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return res.status(400).json({ success: false, message: "请选择要删除的文档" });
    }

    await KnowledgeDocument.update(
      { status: "archived" },
      { where: { id: { [Op.in]: document_ids } } }
    );

    res.json({ success: true, message: `已归档 ${document_ids.length} 个文档` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "批量删除失败" });
  }
};

export const adminGetStats = async (_req: Request, res: Response) => {
  try {
    const totalDocuments = await KnowledgeDocument.count();
    const pendingReview = await KnowledgeDocument.count({ where: { status: "pending_review" } });
    const approved = await KnowledgeDocument.count({ where: { status: "approved" } });
    const totalCategories = await KnowledgeCategory.count({ where: { status: 1 } });

    const byFileType = await KnowledgeDocument.findAll({
      attributes: [
        "file_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["file_type"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        pendingReview,
        approved,
        totalCategories,
        byFileType,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取统计失败" });
  }
};
