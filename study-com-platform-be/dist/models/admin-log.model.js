"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLog = void 0;
// 管理员日志数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class AdminLog extends sequelize_1.Model {
}
exports.AdminLog = AdminLog;
AdminLog.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    admin_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "执行操作的管理员ID",
    },
    action_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        comment: "操作类型：如 封禁用户、审核帖子",
    },
    target_table: {
        type: sequelize_1.DataTypes.STRING(50),
        comment: "被操作的数据表名",
    },
    target_id: {
        type: sequelize_1.DataTypes.INTEGER,
        comment: "被操作的数据ID",
    },
    detail: {
        type: sequelize_1.DataTypes.TEXT,
        comment: "具体操作描述（记录修改前后的变化）",
    },
    ip_address: {
        type: sequelize_1.DataTypes.STRING(45),
        comment: "操作者IP",
    },
}, {
    sequelize: database_1.default,
    modelName: "AdminLog",
    tableName: "admin_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});
exports.default = AdminLog;
//# sourceMappingURL=admin-log.model.js.map