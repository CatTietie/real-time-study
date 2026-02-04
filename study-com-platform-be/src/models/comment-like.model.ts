// 评论点赞记录模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class CommentLike extends Model {
  public id!: number;
  public user_id!: number;
  public comment_id!: number;
  public createdAt!: Date;
}

CommentLike.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "点赞用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    comment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "被点赞的评论ID",
      references: {
        model: "comments",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "CommentLike",
    tableName: "comment_likes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "comment_id"],
      },
      { fields: ["comment_id"] },
      { fields: ["user_id"] },
    ],
  },
);

export default CommentLike;
