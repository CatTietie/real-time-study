// 收藏夹模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class FavoriteFolder extends Model {
  public id!: number;
  public user_id!: number;
  public name!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

FavoriteFolder.init(
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
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: "收藏夹名称",
    },
  },
  {
    sequelize,
    modelName: "FavoriteFolder",
    tableName: "favorite_folders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id"] }],
  },
);

export default FavoriteFolder;
