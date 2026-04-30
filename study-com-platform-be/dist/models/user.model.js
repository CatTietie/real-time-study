"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
// 用户模型类
class User extends sequelize_1.Model {
}
// 初始化用户模型
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '登录账号（学号/管理员名）'
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: '加密存储的密码'
    },
    nickname: {
        type: sequelize_1.DataTypes.STRING(50),
        defaultValue: '新用户',
        allowNull: true,
        comment: '用户昵称'
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: '头像URL路径'
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('admin', 'student', 'super_admin'),
        defaultValue: 'student',
        allowNull: true,
        comment: '角色权限：super_admin-超级管理员, admin-管理员, student-学生'
    },
    points: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true,
        comment: '社区总积分（用于排行榜）'
    },
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        allowNull: true,
        comment: '账号状态：1-启用, 0-封禁'
    },
    last_login: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: '最后登录时间'
    },
    study_duration: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: '学习时长'
    },
    failed_login_attempts: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '登录失败次数'
    },
    lock_until: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: '账号锁定截止时间'
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['created_at']
        },
        {
            fields: ['role']
        },
        {
            fields: ['status']
        }
    ]
});
exports.default = User;
//# sourceMappingURL=user.model.js.map