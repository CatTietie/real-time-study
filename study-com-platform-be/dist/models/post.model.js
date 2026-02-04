"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
// 帖子数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Post extends sequelize_1.Model {
}
exports.Post = Post;
Post.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "发帖人ID",
    },
    title: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: "标题",
    },
    content: {
        type: sequelize_1.DataTypes.TEXT("long"),
        allowNull: false,
        comment: "帖子正文内容",
    },
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 0,
        comment: "审核状态：0-待审核, 1-审核通过, 2-违规退回",
    },
    view_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: "浏览量",
    },
    like_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: "点赞数",
    },
    comment_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: "评论总数",
    },
    is_top: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 0,
        comment: "是否置顶：1-是, 0-否",
    },
}, {
    sequelize: database_1.default,
    modelName: "Post",
    tableName: "posts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
});
exports.default = Post;
//# sourceMappingURL=post.model.js.map