"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLog = void 0;
// 管理员日志数据模型
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
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
        references: {
            model: "users",
            key: "id",
        },
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
    sequelize: sequelize_2.sequelize,
    modelName: "AdminLog",
    tableName: "admin_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
        { fields: ["admin_id"] },
        { fields: ["created_at"] },
        { fields: ["target_table"] },
        { fields: ["target_id"] },
    ],
});
exports.default = AdminLog;
//# sourceMappingURL=admin-log.model.js.map