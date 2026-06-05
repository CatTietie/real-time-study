import multer from "multer";
import path from "path";
import fs from "fs";
import { NextFunction, Request, Response } from "express";
import { ossService } from "../services/oss.service";
import { ossDirectories } from "../config/oss";

const uploadsRoot = path.join(process.cwd(), "uploads", "posts");
const chatUploadsRoot = path.join(process.cwd(), "uploads", "chat");

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

// 磁盘存储（本地存储模式）
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${basename}-${unique}${ext}`);
  },
});

// 内存存储（用于 OSS 上传）
const memoryStorage = multer.memoryStorage();

// 根据 OSS 是否可用选择存储方式
const getStorage = () => {
  if (ossService.isAvailable()) {
    console.log("✅ 使用 OSS 存储模式");
    return memoryStorage;
  }
  console.log("⚠️ 使用本地磁盘存储模式");
  return diskStorage;
};

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("仅支持图片格式"));
  }
  cb(null, true);
};

export const uploadPostImages = multer({
  storage: getStorage(),
  fileFilter,
  limits: {
    files: 4,
  },
});

export const conditionalPostImages = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const contentType = req.headers["content-type"] || "";
  if (
    typeof contentType === "string" &&
    contentType.includes("multipart/form-data")
  ) {
    return uploadPostImages.array("images", 4)(req, res, next);
  }
  return next();
};

/**
 * 上传文件到 OSS（如果 OSS 可用）
 * 如果使用内存存储，则上传到 OSS；如果使用磁盘存储，则保持原逻辑
 */
export const uploadFilesToOss = async (
  req: Request,
  directory: string = ossDirectories.post,
): Promise<string[]> => {
  const files = (req.files || []) as Express.Multer.File[];
  
  if (files.length === 0) {
    return [];
  }

  // 如果 OSS 可用，上传到 OSS
  if (ossService.isAvailable()) {
    const uploadPromises = files.map(async (file) => {
      // 检查是否是内存存储（有 buffer）
      if (file.buffer) {
        return ossService.uploadBuffer(file.buffer, file.originalname, directory);
      }
      // 如果是磁盘存储，则构建本地 URL
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      return `${baseUrl}/uploads/posts/${file.filename}`;
    });

    return Promise.all(uploadPromises);
  }

  // OSS 不可用，使用本地存储
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return files.map((file) => `${baseUrl}/uploads/posts/${file.filename}`);
};

/**
 * 上传单个文件到 OSS
 */
export const uploadSingleFileToOss = async (
  req: Request,
  fieldName: string = "avatar",
  directory: string = ossDirectories.avatar,
): Promise<string | null> => {
  const file = (req as any).file as Express.Multer.File;
  
  if (!file) {
    return null;
  }

  // 如果 OSS 可用，上传到 OSS
  if (ossService.isAvailable()) {
    // 检查是否是内存存储（有 buffer）
    if (file.buffer) {
      return ossService.uploadBuffer(file.buffer, file.originalname, directory);
    }
    // 如果是磁盘存储，则构建本地 URL
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return `${baseUrl}/uploads/${directory}${file.filename}`;
  }

  // OSS 不可用，使用本地存储
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${directory}${file.filename}`;
};

/**
 * 头像上传中间件
 */
export const uploadAvatar = multer({
  storage: getStorage(),
  fileFilter,
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

// 创建聊天文件上传目录
if (!fs.existsSync(chatUploadsRoot)) {
  fs.mkdirSync(chatUploadsRoot, { recursive: true });
}

// 聊天文件上传的磁盘存储
const chatDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, chatUploadsRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${basename}-${unique}${ext}`);
  },
});

// 聊天文件上传：允许所有文件类型
const chatFileFilter: multer.Options["fileFilter"] = (_req, _file, cb) => {
  // 允许所有文件类型
  cb(null, true);
};

// 根据 OSS 是否可用选择聊天文件的存储方式
const getChatStorage = () => {
  if (ossService.isAvailable()) {
    console.log("✅ 聊天文件使用 OSS 存储模式");
    return memoryStorage;
  }
  console.log("⚠️ 聊天文件使用本地磁盘存储模式");
  return chatDiskStorage;
};

/**
 * 聊天文件上传中间件
 * 支持任意文件类型，单个文件最大 50MB
 */
export const uploadChatFile = multer({
  storage: getChatStorage(),
  fileFilter: chatFileFilter,
  limits: {
    files: 1,
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// 录制文件上传：允许视频文件类型
const recordingFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimes = ["video/webm", "video/mp4", "video/x-matroska"];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("仅支持 webm/mp4 视频格式"));
  }
  cb(null, true);
};

/**
 * 录制文件上传中间件
 * 支持 webm/mp4 视频文件，单个文件最大 500MB
 */
export const uploadRecordingFile = multer({
  storage: getStorage(),
  fileFilter: recordingFileFilter,
  limits: {
    files: 1,
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

/**
 * 上传录制文件到 OSS
 */
export const uploadRecordingToOss = async (
  req: Request,
): Promise<{
  file_url: string;
  file_name: string;
  file_size: number;
} | null> => {
  const file = (req as any).file as Express.Multer.File;

  if (!file) {
    return null;
  }

  const originalName = file.originalname;
  const fileSize = file.size;

  if (ossService.isAvailable()) {
    if (file.buffer) {
      const fileUrl = await ossService.uploadBuffer(file.buffer, file.originalname, ossDirectories.recording);
      return { file_url: fileUrl, file_name: originalName, file_size: fileSize };
    }
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return {
      file_url: `${baseUrl}/uploads/recordings/${file.filename}`,
      file_name: originalName,
      file_size: fileSize,
    };
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return {
    file_url: `${baseUrl}/uploads/recordings/${file.filename}`,
    file_name: originalName,
    file_size: fileSize,
  };
};

/**
 * 上传聊天文件到 OSS（如果 OSS 可用）
 */
export const uploadChatFileToOss = async (
  req: Request,
): Promise<{
  file_url: string;
  file_name: string;
  file_size: number;
} | null> => {
  const file = (req as any).file as Express.Multer.File;

  if (!file) {
    return null;
  }

  const originalName = file.originalname;
  const fileSize = file.size;

  // 如果 OSS 可用，上传到 OSS
  if (ossService.isAvailable()) {
    // 检查是否是内存存储（有 buffer）
    if (file.buffer) {
      const fileUrl = await ossService.uploadBuffer(file.buffer, file.originalname, ossDirectories.chat);
      return {
        file_url: fileUrl,
        file_name: originalName,
        file_size: fileSize,
      };
    }
    // 如果是磁盘存储，则构建本地 URL
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return {
      file_url: `${baseUrl}/uploads/chat/${file.filename}`,
      file_name: originalName,
      file_size: fileSize,
    };
  }

  // OSS 不可用，使用本地存储
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return {
    file_url: `${baseUrl}/uploads/chat/${file.filename}`,
    file_name: originalName,
    file_size: fileSize,
  };
};

// ===== 知识文库文件上传 =====

const knowledgeUploadsRoot = path.join(process.cwd(), "uploads", "knowledge");
if (!fs.existsSync(knowledgeUploadsRoot)) {
  fs.mkdirSync(knowledgeUploadsRoot, { recursive: true });
}

const knowledgeDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, knowledgeUploadsRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${basename}-${unique}${ext}`);
  },
});

const getKnowledgeStorage = () => {
  if (ossService.isAvailable()) {
    return memoryStorage;
  }
  return knowledgeDiskStorage;
};

const knowledgeFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("不支持的文件格式，仅支持 PDF、Word、PPT、图片"));
  }
  cb(null, true);
};

/**
 * 知识文库文件上传中间件
 * 支持 PDF/Word/PPT/图片，单个文件最大 100MB
 */
export const uploadKnowledgeFile = multer({
  storage: getKnowledgeStorage(),
  fileFilter: knowledgeFileFilter,
  limits: {
    files: 1,
    fileSize: 100 * 1024 * 1024,
  },
});

/**
 * 上传知识文库文件到 OSS
 */
export const uploadKnowledgeFileToOss = async (
  req: Request,
): Promise<{
  file_url: string;
  file_name: string;
  file_size: number;
} | null> => {
  const file = (req as any).file as Express.Multer.File;

  if (!file) {
    return null;
  }

  const originalName = file.originalname;
  const fileSize = file.size;

  if (ossService.isAvailable()) {
    if (file.buffer) {
      const fileUrl = await ossService.uploadBuffer(file.buffer, file.originalname, ossDirectories.knowledge);
      return { file_url: fileUrl, file_name: originalName, file_size: fileSize };
    }
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return {
      file_url: `${baseUrl}/uploads/knowledge/${file.filename}`,
      file_name: originalName,
      file_size: fileSize,
    };
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return {
    file_url: `${baseUrl}/uploads/knowledge/${file.filename}`,
    file_name: originalName,
    file_size: fileSize,
  };
};
