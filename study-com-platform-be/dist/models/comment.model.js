"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = void 0;
// 评论数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Comment extends sequelize_1.Model {
}
exports.Comment = Comment;
Comment.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    post_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "所属帖子ID",
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "评论人ID",
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        comment: "评论内容",
    },
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        comment: "状态：1-显示, 0-因违规隐藏",
    },
}, {
    sequelize: database_1.default,
    modelName: "Comment",
    tableName: "comments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});
exports.default = Comment;
//# sourceMappingURL=comment.model.js.map