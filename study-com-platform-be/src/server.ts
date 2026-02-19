// 服务器入口文件
// 必须在任何其他导入之前加载环境变量
import dotenv from "dotenv";
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';
import app from "./app";
import { connectDB } from "./config/database";
import { log } from "./utils/logger";
import { checkExpiredReservations } from "./controllers/study-room.controller";
import { initChatSockets } from './services/chat-realtime.service';
import { initWhiteboardSockets } from './services/whiteboard-realtime.service';
import { seedChatRooms } from './seed/chat.seed';

// 创建HTTP服务器
const httpServer = createServer(app);

// 初始化Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});

// 初始化实时服务
initChatSockets(io);
initWhiteboardSockets(io);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log(`🚀 Starting server on port ${PORT}...`);
    // 连接数据库
    await connectDB();

    // 启动服务器
    httpServer.listen(PORT, async () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
      console.log(`🔌 Socket.IO real-time service started`);
      
      // 初始化默认数据
      await seedChatRooms();
      
      // 启动定时任务，每5分钟检查一次过期预约
      setInterval(checkExpiredReservations, 5 * 60 * 1000);
      // 立即执行一次检查
      checkExpiredReservations();
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();


