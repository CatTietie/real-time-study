"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostLike = void 0;
// 点赞记录数据模型
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
class PostLike extends sequelize_1.Model {
}
exports.PostLike = PostLike;
PostLike.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "点赞用户ID",
        references: {
            model: "users",
            key: "id",
        },
    },
    post_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "被点赞的帖子ID",
        references: {
            model: "posts",
            key: "id",
        },
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: "PostLike",
    tableName: "post_likes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ["user_id", "post_id"],
        },
        { fields: ["post_id"] },
        { fields: ["user_id"] },
    ],
});
exports.default = PostLike;
//# sourceMappingURL=post-like.model.js.map