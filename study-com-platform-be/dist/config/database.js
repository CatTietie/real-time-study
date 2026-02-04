"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
// 数据库配置文件
const sequelize_1 = require("sequelize");
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME || "study_platform", process.env.DB_USER || "root", process.env.DB_PASSWORD || "root", {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("MySQL connected successfully");
        // 同步数据模型（创建表）
        await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
        console.log("Database tables synchronized");
        return sequelize;
    }
    catch (error) {
        console.error("MySQL connection failed:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
exports.default = sequelize;
//# sourceMappingURL=database.js.map