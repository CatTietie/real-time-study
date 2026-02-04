// 数据库配置文件
import { QueryTypes } from "sequelize";
import { initAssociations } from "../models/associations";
import { sequelize } from "./sequelize";
import { seedAdminUsers } from "../seed/admin.seed";
import { seedDashboardData } from "../seed/dashboard.seed";

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
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
    initAssociations();

    // 同步数据模型（创建表）
    const shouldAlter = process.env.DB_SYNC_ALTER === "true";
    await sequelize.sync({ alter: shouldAlter });
    console.log("Database tables synchronized");

    // 确保 posts.images 字段存在（避免全量 alter 触发索引数量上限）
    const [imageColumn] = (await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'posts'
         AND COLUMN_NAME = 'images'`,
      { type: QueryTypes.SELECT },
    )) as Array<{ COLUMN_NAME: string }>;

    if (!imageColumn) {
      await sequelize.query("ALTER TABLE posts ADD COLUMN images TEXT NULL");
    }

    // 可选：初始化管理员账号
    if (process.env.SEED_ADMIN === "true") {
      const result = await seedAdminUsers();
      console.log(
        `Admin seed completed: created=${result.created}, skipped=${result.skipped}`,
      );
    }

    // 可选：初始化仪表盘演示数据
    if (process.env.SEED_DASHBOARD === "true") {
      const result = await seedDashboardData();
      console.log(
        `Dashboard seed completed: users=${result.users}, posts=${result.posts}, reports=${result.reports}, adminLogs=${result.adminLogs}`,
      );
    }

    return sequelize;
  } catch (error) {
    console.error("MySQL connection failed:", error);
    process.exit(1);
  }
};

export default sequelize;
