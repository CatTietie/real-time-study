// 点赞记录数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class PostLike extends Model {
  public id!: number;
  public user_id!: number;
  public post_id!: number;
  public createdAt!: Date;
}

PostLike.init(
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
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "被点赞的帖子ID",
      references: {
        model: "posts",
        key: "id",
      },
    },
  },
  {
    sequelize,
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
  },
);

export default PostLike;
