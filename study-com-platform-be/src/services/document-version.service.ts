import KnowledgeDocument from "../models/knowledge-document.model";
import DocumentVersion from "../models/document-version.model";
import User from "../models/user.model";
import { sequelize } from "../config/sequelize";

export class DocumentVersionService {
  /**
   * Create a new version for a document
   */
  static async createVersion(params: {
    documentId: number;
    originalUrl: string;
    previewUrl?: string;
    fileSize: number;
    contentText?: string;
    changeSummary?: string;
    creatorId: number;
  }) {
    const { documentId, originalUrl, previewUrl, fileSize, contentText, changeSummary, creatorId } = params;

    return await sequelize.transaction(async (t) => {
      const document = await KnowledgeDocument.findByPk(documentId, { transaction: t });
      if (!document) throw new Error("文档不存在");

      const newVersionNumber = document.current_version + 1;

      const version = await DocumentVersion.create(
        {
          document_id: documentId,
          version_number: newVersionNumber,
          original_url: originalUrl,
          preview_url: previewUrl || null,
          file_size: fileSize,
          content_text: contentText || null,
          change_summary: changeSummary || null,
          creator_id: creatorId,
        },
        { transaction: t }
      );

      await document.update(
        {
          current_version: newVersionNumber,
          original_url: originalUrl,
          preview_url: previewUrl || document.preview_url,
          file_size: fileSize,
          content_text: contentText || document.content_text,
        },
        { transaction: t }
      );

      return version;
    });
  }

  /**
   * Restore a previous version as the current version
   */
  static async restoreVersion(documentId: number, versionId: number, userId: number) {
    return await sequelize.transaction(async (t) => {
      const document = await KnowledgeDocument.findByPk(documentId, { transaction: t });
      if (!document) throw new Error("文档不存在");

      const version = await DocumentVersion.findOne({
        where: { id: versionId, document_id: documentId },
        transaction: t,
      });
      if (!version) throw new Error("版本不存在");

      const newVersionNumber = document.current_version + 1;

      const newVersion = await DocumentVersion.create(
        {
          document_id: documentId,
          version_number: newVersionNumber,
          original_url: version.original_url,
          preview_url: version.preview_url,
          file_size: version.file_size,
          content_text: version.content_text,
          change_summary: `从版本 v${version.version_number} 恢复`,
          creator_id: userId,
        },
        { transaction: t }
      );

      await document.update(
        {
          current_version: newVersionNumber,
          original_url: version.original_url,
          preview_url: version.preview_url,
          file_size: version.file_size,
          content_text: version.content_text,
        },
        { transaction: t }
      );

      return newVersion;
    });
  }

  /**
   * List all versions of a document
   */
  static async listVersions(documentId: number) {
    return await DocumentVersion.findAll({
      where: { document_id: documentId },
      include: [
        { model: User, as: "Creator", attributes: ["id", "username", "nickname", "avatar"] },
      ],
      order: [["version_number", "DESC"]],
    });
  }
}

export default DocumentVersionService;
