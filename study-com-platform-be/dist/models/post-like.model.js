"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostLike = void 0;
// 点赞记录数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
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
    },
    post_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "被点赞的帖子ID",
    },
}, {
    sequelize: database_1.default,
    modelName: "PostLike",
    tableName: "post_likes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});
exports.default = PostLike;
//# sourceMappingURL=post-like.model.js.map