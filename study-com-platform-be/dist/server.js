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
const logger_1 = require("./utils/logger");
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        // 连接数据库
        await (0, database_1.connectDB)();
        // 启动服务器
        app_1.default.listen(PORT, () => {
            (0, logger_1.log)(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        (0, logger_1.log)("Failed to start server", error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map