"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
// 帖子数据模型
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
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
        references: {
            model: "users",
            key: "id",
        },
    },
    title: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: "标题",
    },
    category: {
        type: sequelize_1.DataTypes.STRING(50),
        comment: "帖子分类",
    },
    tags: {
        type: sequelize_1.DataTypes.TEXT,
        comment: "标签（JSON数组字符串）",
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
    publish_status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        comment: "发布状态：0-草稿, 1-已发布, 2-已删除, 3-已锁定",
    },
    audit_admin_id: {
        type: sequelize_1.DataTypes.INTEGER,
        comment: "审核管理员ID",
        references: {
            model: "users",
            key: "id",
        },
    },
    audit_reason: {
        type: sequelize_1.DataTypes.STRING(255),
        comment: "审核原因/备注",
    },
    audit_at: {
        type: sequelize_1.DataTypes.DATE,
        comment: "审核时间",
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
    edit_count: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        comment: "编辑次数",
    },
    images: {
        type: sequelize_1.DataTypes.TEXT,
        comment: "帖子图片(JSON数组字符串)",
    },
    last_edited_at: {
        type: sequelize_1.DataTypes.DATE,
        comment: "最后编辑时间",
    },
    deleted_at: {
        type: sequelize_1.DataTypes.DATE,
        comment: "删除时间（回收站）",
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: "Post",
    tableName: "posts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ["user_id"] },
        { fields: ["status"] },
        { fields: ["publish_status"] },
        { fields: ["category"] },
        { fields: ["created_at"] },
        { fields: ["audit_admin_id"] },
    ],
});
exports.default = Post;
//# sourceMappingURL=post.model.js.map