import { Request, Response } from "express";
import DocumentVersionService from "../services/document-version.service";
import DocumentVersion from "../models/document-version.model";
import User from "../models/user.model";
import { uploadKnowledgeFileToOss } from "../middlewares/upload.middleware";
import KnowledgeDocumentService from "../services/knowledge-document.service";

export const listVersions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versions = await DocumentVersionService.listVersions(Number(id));
    res.json({ success: true, data: versions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取版本列表失败" });
  }
};

export const getVersion = async (req: Request, res: Response) => {
  try {
    const { id, vid } = req.params;

    const version = await DocumentVersion.findOne({
      where: { id: Number(vid), document_id: Number(id) },
      include: [
        { model: User, as: "Creator", attributes: ["id", "username", "nickname", "avatar"] },
      ],
    });

    if (!version) {
      return res.status(404).json({ success: false, message: "版本不存在" });
    }

    res.json({ success: true, data: version });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "获取版本详情失败" });
  }
};

export const uploadNewVersion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { change_summary } = req.body;

    const uploadResult = await uploadKnowledgeFileToOss(req);
    if (!uploadResult) {
      return res.status(400).json({ success: false, message: "请选择要上传的文件" });
    }

    const { file_url, file_name, file_size } = uploadResult;
    const file = (req as any).file as Express.Multer.File;
    const fileType = KnowledgeDocumentService.getFileType(file.mimetype);

    let contentText = "";
    if (file.buffer && (fileType === "pdf" || fileType === "word")) {
      contentText = await KnowledgeDocumentService.extractTextContent(file.buffer, fileType);
    }

    const version = await DocumentVersionService.createVersion({
      documentId: Number(id),
      originalUrl: file_url,
      previewUrl: fileType === "pdf" || fileType === "image" ? file_url : undefined,
      fileSize: file_size,
      contentText: contentText || undefined,
      changeSummary: change_summary || `由 ${(req as any).user.username} 上传新版本`,
      creatorId: userId,
    });

    res.status(201).json({ success: true, data: version, message: "新版本上传成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "上传新版本失败" });
  }
};

export const restoreVersion = async (req: Request, res: Response) => {
  try {
    const { id, vid } = req.params;
    const userId = (req as any).user.id;

    const version = await DocumentVersionService.restoreVersion(Number(id), Number(vid), userId);

    res.json({ success: true, data: version, message: "版本恢复成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "版本恢复失败" });
  }
};
