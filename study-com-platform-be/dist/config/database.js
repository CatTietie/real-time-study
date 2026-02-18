"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
// 数据库配置文件
const sequelize_1 = require("sequelize");
const associations_1 = require("../models/associations");
const sequelize_2 = require("./sequelize");
const admin_seed_1 = require("../seed/admin.seed");
const dashboard_seed_1 = require("../seed/dashboard.seed");
const connectDB = async () => {
    try {
        await sequelize_2.sequelize.authenticate();
        console.log("MySQL connected successfully");
        // 导入所有模型
        const User = require("../models/user.model").default;
        const Post = require("../models/post.model").default;
        const Comment = require("../models/comment.model").default;
        const Report = require("../models/report.model").default;
        const AdminLog = require("../models/admin-log.model").default;
        const PostLike = require("../models/post-like.model").default;
        const SensitiveWord = require("../models/sensitive-word.model").default;
        const PointsLog = require("../models/points-log.model").default;
        const PointsRule = require("../models/points-rule.model").default;
        const Role = require("../models/role.model").default;
        const Permission = require("../models/permission.model").default;
        const UserRole = require("../models/user-role.model").default;
        const RolePermission = require("../models/role-permission.model").default;
        const ContentAudit = require("../models/content-audit.model").default;
        // 初始化模型关联关系
        (0, associations_1.initAssociations)();
        // 同步数据模型（创建表）
        const shouldAlter = process.env.DB_SYNC_ALTER === "true";
        await sequelize_2.sequelize.sync({ alter: shouldAlter });
        console.log("Database tables synchronized");
        // 确保 posts.images 字段存在（避免全量 alter 触发索引数量上限）
        const [imageColumn] = (await sequelize_2.sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'posts'
         AND COLUMN_NAME = 'images'`, { type: sequelize_1.QueryTypes.SELECT }));
        if (!imageColumn) {
            await sequelize_2.sequelize.query("ALTER TABLE posts ADD COLUMN images TEXT NULL");
        }
        // 可选：初始化管理员账号
        if (process.env.SEED_ADMIN === "true") {
            const result = await (0, admin_seed_1.seedAdminUsers)();
            console.log(`Admin seed completed: created=${result.created}, skipped=${result.skipped}`);
        }
        // 可选：初始化仪表盘演示数据
        if (process.env.SEED_DASHBOARD === "true") {
            console.log("Seeding dashboard data...");
            const result = await (0, dashboard_seed_1.seedDashboardData)();
            console.log(`✅ Dashboard seed completed: users=${result.users}, posts=${result.posts}, reports=${result.reports}, adminLogs=${result.adminLogs}`);
        }
        return sequelize_2.sequelize;
    }
    catch (error) {
        console.error("MySQL connection failed:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
exports.default = sequelize_2.sequelize;
//# sourceMappingURL=database.js.map