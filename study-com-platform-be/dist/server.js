"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 服务器入口文件
// 必须在任何其他导入之前加载环境变量
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const study_room_controller_1 = require("./controllers/study-room.controller");
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        console.log(`🚀 Starting server on port ${PORT}...`);
        // 连接数据库
        await (0, database_1.connectDB)();
        // 启动服务器
        app_1.default.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
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