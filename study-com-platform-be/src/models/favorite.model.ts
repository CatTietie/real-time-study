// 收藏记录模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Favorite extends Model {
  public id!: number;
  public user_id!: number;
  public post_id!: number;
  public folder_id?: number;
  public note?: string;
  public tags?: string;
  public createdAt!: Date;
}

Favorite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "帖子ID",
      references: {
        model: "posts",
        key: "id",
      },
    },
    folder_id: {
      type: DataTypes.INTEGER,
      comment: "收藏夹ID",
      references: {
        model: "favorite_folders",
        key: "id",
      },
    },
    note: {
      type: DataTypes.STRING(255),
      comment: "收藏备注",
    },
    tags: {
      type: DataTypes.TEXT,
      comment: "收藏标签（JSON数组字符串）",
    },
  },
  {
    sequelize,
    modelName: "Favorite",
    tableName: "favorites",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["post_id"] },
      { fields: ["folder_id"] },
      { unique: true, fields: ["user_id", "post_id"] },
    ],
  },
);

export default Favorite;
