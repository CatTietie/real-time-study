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
   * Auto-classify document by matching filename/tags against category names and keywords.
   * Uses a scoring system to pick the best match and avoid false positives.
   * Returns category_id or null (pending bucket).
   */
  static async classifyDocument(
    filename: string,
    tags?: string
  ): Promise<number | null> {
    if (!filename || !filename.trim()) return null;

    const categories = await KnowledgeCategory.findAll({
      where: { status: 1 },
      attributes: ["id", "name", "description"],
    });

    if (categories.length === 0) return null;

    const nameWithoutExt = filename.replace(/\.[^.]+$/, "").trim();
    if (!nameWithoutExt) return null;

    const MIN_TOKEN_LENGTH = 2;

    const tokens = nameWithoutExt
      .split(/[\s\-_,.;:，。；：、()（）【】\[\]{}「」《》<>]+/)
      .filter((t) => t.length >= MIN_TOKEN_LENGTH)
      .map((t) => t.toLowerCase());

    const tagTokens = (tags || "")
      .split(/[,;，；\s]+/)
      .filter((t) => t.length >= MIN_TOKEN_LENGTH)
      .map((t) => t.toLowerCase());

    const allTokens = [...tokens, ...tagTokens];
    const searchText = `${nameWithoutExt} ${tags || ""}`.toLowerCase();

    let bestMatch: { id: number; score: number } | null = null;

    for (const cat of categories) {
      const catName = cat.name.toLowerCase().trim();
      if (catName.length < MIN_TOKEN_LENGTH) continue;

      let score = 0;

      if (searchText.includes(catName)) {
        score += catName.length * 3;
      }

      for (const token of allTokens) {
        if (token === catName) {
          score += catName.length * 2;
        } else if (token.length >= MIN_TOKEN_LENGTH && catName.length >= 3 && token.includes(catName)) {
          score += catName.length;
        } else if (catName.length >= MIN_TOKEN_LENGTH && token.length >= 3 && catName.includes(token)) {
          score += token.length;
        }
      }

      const desc = ((cat as any).description || "") as string;
      if (desc) {
        const keywords = desc
          .split(/[,;，；\s]+/)
          .filter((k) => k.length >= MIN_TOKEN_LENGTH)
          .map((k) => k.toLowerCase());

        for (const kw of keywords) {
          if (searchText.includes(kw)) {
            score += kw.length * 2;
          } else if (allTokens.includes(kw)) {
            score += kw.length;
          }
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: cat.id, score };
      }
    }

    if (bestMatch && bestMatch.score >= 4) {
      return bestMatch.id;
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

      if (fileType === "ppt") {
        return this.extractPptText(buffer);
      }

      return "";
    } catch (error) {
      console.error("文本提取失败:", error);
      return "";
    }
  }

  /**
   * Extract text from PPTX file by parsing the ZIP/XML structure
   */
  static async extractPptText(buffer: Buffer): Promise<string> {
    try {
      const JSZip = require("jszip");
      const zip = await JSZip.loadAsync(buffer);

      const texts: string[] = [];
      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
          const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
          return numA - numB;
        });

      for (const slideFile of slideFiles) {
        const content = await zip.file(slideFile)?.async("string");
        if (content) {
          const slideText = content
            .replace(/<a:t[^>]*>(.*?)<\/a:t>/g, "$1 ")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (slideText) {
            texts.push(slideText);
          }
        }
      }

      return texts.join("\n");
    } catch (error) {
      console.error("PPT文本提取失败:", error);
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

    const escapedKeyword = sequelize.escape(keyword);

    try {
      const { rows, count } = await KnowledgeDocument.findAndCountAll({
        where: {
          ...where,
          [Op.and]: [
            literal(
              `MATCH(title, content_text, tags) AGAINST(${escapedKeyword} IN BOOLEAN MODE)`
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
      const safeKeyword = keyword.replace(/[%_]/g, "\\$&");
      const { rows, count } = await KnowledgeDocument.findAndCountAll({
        where: {
          ...where,
          [Op.or]: [
            { title: { [Op.like]: `%${safeKeyword}%` } },
            { content_text: { [Op.like]: `%${safeKeyword}%` } },
            { tags: { [Op.like]: `%${safeKeyword}%` } },
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
