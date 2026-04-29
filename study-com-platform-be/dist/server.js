"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 服务器入口文件
// 必须在任何其他导入之前加载环境变量
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const study_room_controller_1 = require("./controllers/study-room.controller");
const chat_realtime_service_1 = require("./services/chat-realtime.service");
const whiteboard_realtime_service_1 = require("./services/whiteboard-realtime.service");
const chat_seed_1 = require("./seed/chat.seed");
const socketManager_1 = require("./utils/socketManager");
// 创建HTTP服务器
const httpServer = (0, http_1.createServer)(app_1.default);
// 初始化Socket.IO
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true
    }
});
// 将 io 实例存储到 socketManager
(0, socketManager_1.setSocketIo)(io);
// 初始化实时服务
(0, chat_realtime_service_1.initChatSockets)(io);
(0, whiteboard_realtime_service_1.initWhiteboardSockets)(io);
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        console.log(`🚀 Starting server on port ${PORT}...`);
        // 连接数据库
        await (0, database_1.connectDB)();
        // 启动服务器
        httpServer.listen(PORT, async () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
            console.log(`🔌 Socket.IO real-time service started`);
            // 初始化默认数据
            await (0, chat_seed_1.seedChatRooms)();
            // 启动定时任务，每5分钟检查一次过期预约
            setInterval(study_room_controller_1.checkExpiredReservations, 5 * 60 * 1000);
            // 立即执行一次检查
            (0, study_room_controller_1.checkExpiredReservations)();
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map