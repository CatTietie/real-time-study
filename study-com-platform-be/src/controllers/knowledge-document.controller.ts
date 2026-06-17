import { Request, Response } from "express";
import KnowledgeDocument from "../models/knowledge-document.model";
import KnowledgeCategory from "../models/knowledge-category.model";
import DocumentVersion from "../models/document-version.model";
import User from "../models/user.model";
import { Op } from "sequelize";
import { uploadKnowledgeFileToOss } from "../middlewares/upload.middleware";
import KnowledgeDocumentService from "../services/knowledge-document.service";

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const uploadResult = await uploadKnowledgeFileToOss(req);
    if (!uploadResult) {
      return res.status(400).json({ success: false, message: "请选择要上传的文件" });
    }

    const { file_url, file_name, file_size } = uploadResult;
    const { title, tags, category_id } = req.body;
    const userId = (req as any).user.id;
    const file = (req as any).file as Express.Multer.File;

    const fileType = KnowledgeDocumentService.getFileType(file.mimetype);

    let contentText = "";
    if (file.buffer && (fileType === "pdf" || fileType === "word")) {
      contentText = await KnowledgeDocumentService.extractTextContent(file.buffer, fileType);
    }

    let categoryId = category_id ? Number(category_id) : null;
    if (!categoryId) {
      categoryId = await KnowledgeDocumentService.classifyDocument(file_name, tags);
    }

    const documentTitle = title || file_name.replace(/\.[^/.]+$/, "");

    const document = await KnowledgeDocument.create({
      title: documentTitle,
      category_id: categoryId,
      uploader_id: userId,
      file_type: fileType,
      original_url: file_url,
      original_filename: file_name,
      preview_url: fileType === "pdf" || fileType === "image" ? file_url : null,
      file_size: file_size,
      content_text: contentText || null,
      tags: tags || null,
      status: "pending_review",
    });

    await DocumentVersion.create({
      document_id: document.id,
      version_number: 1,
      original_url: file_url,
      preview_url: fileType === "pdf" || fileType === "image" ? file_url : null,
      file_size: file_size,
      content_text: contentText || null,
      change_summary: "初始版本",
      creator_id: userId,
    });

    res.status(201).json({
      success: true,
      message: "文件上传成功，等待审核",
      data: document,
    });
  } catch (error: any) {
    console.error("上传文档失败:", error);
    res.status(500).json({ success: false, message: error.message || "上传失败" });
  }
};

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, category_id, file_type, status, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    const userRole = (req as any).user.role;

    if (userRole === "admin" || userRole === "super_admin") {
      if (status) where.status = status;
    } else {
      where.status = "approved";
    }

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

export const getDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await KnowledgeDocument.findByPk(id, {
      include: [
        { model: User, as: "Uploader", attributes: ["id", "username", "nickname", "avatar"] },
        { model: KnowledgeCategory, as: "Category", attributes: ["id", "name"] },
      ],
    });

    if (!document) {
      return res.status(404).json({ success: false, message: "文档不存在" });
    }

    await document.increment("view_count");

    res.json({ success: true, data: document });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取文档详情失败" });
  }
};

export const searchDocuments = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, pageSize = 20, category_id, file_type } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: "请输入搜索关键词" });
    }

    const result = await KnowledgeDocumentService.searchDocuments(
      String(q),
      {
        categoryId: category_id ? Number(category_id) : undefined,
        fileType: file_type as string | undefined,
        page: Number(page),
        pageSize: Number(pageSize),
      }
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.count,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(result.count / Number(pageSize)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "搜索失败" });
  }
};

export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await KnowledgeDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, message: "文档不存在" });
    }

    await document.increment("download_count");

    res.json({
      success: true,
      data: {
        url: document.original_url,
        filename: document.original_filename,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "下载失败" });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await KnowledgeCategory.findAll({
      where: { status: 1 },
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
    res.status(500).json({ success: false, message: error.message || "获取分类失败" });
  }
};
