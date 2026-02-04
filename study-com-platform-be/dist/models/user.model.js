"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
// 用户数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: "登录账号（学号/管理员名）",
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: "加密存储的密码",
    },
    nickname: {
        type: sequelize_1.DataTypes.STRING(50),
        defaultValue: "新用户",
        comment: "用户昵称",
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING(255),
        comment: "头像URL路径",
    },
    role: {
        type: sequelize_1.DataTypes.ENUM("admin", "student"),
        defaultValue: "student",
        comment: "角色权限：admin-管理员, student-学生",
    },
    points: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: "社区总积分（用于排行榜）",
    },
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        comment: "账号状态：1-启用, 0-封禁",
    },
    last_login: {
        type: sequelize_1.DataTypes.DATE,
        comment: "最后登录时间",
    },
}, {
    sequelize: database_1.default,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
});
exports.default = User;
//# sourceMappingURL=user.model.js.map