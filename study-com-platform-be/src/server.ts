// 服务器入口文件
// 必须在任何其他导入之前加载环境变量
import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/database";
import { log } from "./utils/logger";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log(`🚀 Starting server on port ${PORT}...`);
    // 连接数据库
    await connectDB();

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
