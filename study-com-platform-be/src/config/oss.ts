// OSS 配置
import dotenv from "dotenv";
import path from "path";

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), ".env") });

export const ossConfig = {
  region: process.env.OSS_REGION || "oss-cn-beijing",
  bucket: process.env.OSS_BUCKET || "weblog-dev",
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || "",
  endpoint: process.env.OSS_ENDPOINT || "oss-cn-beijing.aliyuncs.com",
  domain: process.env.OSS_DOMAIN || "weblog-dev.oss-cn-beijing.aliyuncs.com",
};

// 检查 OSS 配置是否完整
export const isOssConfigured = (): boolean => {
  return (
    !!ossConfig.accessKeyId &&
    !!ossConfig.accessKeySecret &&
    !!ossConfig.bucket &&
    !!ossConfig.region
  );
};

// OSS 存储目录配置
export const ossDirectories = {
  avatar: "avatars/",
  post: "posts/",
  temp: "temp/",
};
