import multer from "multer";
import path from "path";
import fs from "fs";
import { NextFunction, Request, Response } from "express";

const uploadsRoot = path.join(process.cwd(), "uploads", "posts");

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
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

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("仅支持图片格式"));
  }
  cb(null, true);
};

export const uploadPostImages = multer({
  storage,
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
