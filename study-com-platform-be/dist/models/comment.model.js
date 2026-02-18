"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = void 0;
// 评论数据模型
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
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
        references: {
            model: "posts",
            key: "id",
        },
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "评论人ID",
        references: {
            model: "users",
            key: "id",
        },
    },
    parent_id: {
        type: sequelize_1.DataTypes.INTEGER,
        comment: "父评论ID（楼中楼）",
        references: {
            model: "comments",
            key: "id",
        },
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
    like_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: "点赞数",
    },
    is_deleted: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 0,
        comment: "是否删除：1-已删除",
    },
    deleted_at: {
        type: sequelize_1.DataTypes.DATE,
        comment: "删除时间",
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: "Comment",
    tableName: "comments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ["post_id"] },
        { fields: ["user_id"] },
        { fields: ["created_at"] },
        { fields: ["parent_id"] },
        { fields: ["is_deleted"] },
    ],
});
exports.default = Comment;
//# sourceMappingURL=comment.model.js.map