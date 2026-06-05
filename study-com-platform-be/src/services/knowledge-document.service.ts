import KnowledgeCategory from "../models/knowledge-category.model";
import KnowledgeDocument from "../models/knowledge-document.model";
import { Op, literal } from "sequelize";
import { sequelize } from "../config/sequelize";
import User from "../models/user.model";

export class KnowledgeDocumentService {
  /**
   * Detect file type from mimetype
   */
  static getFileType(mimetype: string): "pdf" | "word" | "ppt" | "image" | "other" {
    if (mimetype === "application/pdf") return "pdf";
    if (
      mimetype === "application/msword" ||
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return "word";
    if (
      mimetype === "application/vnd.ms-powerpoint" ||
      mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
      return "ppt";
    if (mimetype.startsWith("image/")) return "image";
    return "other";
  }

  /**
   * Auto-classify document by matching filename/tags against category names
   * Returns category_id or null (pending bucket)
   */
  static async classifyDocument(
    filename: string,
    tags?: string
  ): Promise<number | null> {
    const categories = await KnowledgeCategory.findAll({
      where: { status: 1 },
      attributes: ["id", "name"],
    });

    const searchText = `${filename} ${tags || ""}`.toLowerCase();

    for (const cat of categories) {
      if (searchText.includes(cat.name.toLowerCase())) {
        return cat.id;
      }
    }

    return null;
  }

  /**
   * Extract text content from file buffer based on type
   */
  static async extractTextContent(
    buffer: Buffer,
    fileType: string
  ): Promise<string> {
    try {
      if (fileType === "pdf") {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        return data.text || "";
      }

      if (fileType === "word") {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value || "";
      }

      return "";
    } catch (error) {
      console.error("文本提取失败:", error);
      return "";
    }
  }

  /**
   * Full-text search documents using MySQL FULLTEXT index
   */
  static async searchDocuments(
    keyword: string,
    options: {
      categoryId?: number;
      fileType?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const { categoryId, fileType, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    const where: any = { status: "approved" };
    if (categoryId) where.category_id = categoryId;
    if (fileType) where.file_type = fileType;

    try {
      const { rows, count } = await KnowledgeDocument.findAndCountAll({
        where: {
          ...where,
          [Op.and]: [
            literal(
              `MATCH(title, content_text, tags) AGAINST('${keyword.replace(/'/g, "\\'")}' IN BOOLEAN MODE)`
            ),
          ],
        },
        include: [
          { model: User, as: "Uploader", attributes: ["id", "username", "nickname", "avatar"] },
          { model: KnowledgeCategory, as: "Category", attributes: ["id", "name"] },
        ],
        order: [["created_at", "DESC"]],
        limit: pageSize,
        offset,
      });

      return { rows, count };
    } catch {
      // Fallback to LIKE search if FULLTEXT not available
      const { rows, count } = await KnowledgeDocument.findAndCountAll({
        where: {
          ...where,
          [Op.or]: [
            { title: { [Op.like]: `%${keyword}%` } },
            { content_text: { [Op.like]: `%${keyword}%` } },
            { tags: { [Op.like]: `%${keyword}%` } },
          ],
        },
        include: [
          { model: User, as: "Uploader", attributes: ["id", "username", "nickname", "avatar"] },
          { model: KnowledgeCategory, as: "Category", attributes: ["id", "name"] },
        ],
        order: [["created_at", "DESC"]],
        limit: pageSize,
        offset,
      });

      return { rows, count };
    }
  }
}

export default KnowledgeDocumentService;
