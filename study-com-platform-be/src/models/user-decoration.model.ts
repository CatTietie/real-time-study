import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class UserDecoration extends Model {
  public id!: number;
  public user_id!: number;
  public product_id!: number;
  public decoration_type!: "avatar_frame" | "profile_background" | "study_room_skin";
  public is_equipped!: boolean;
  public obtained_at!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

UserDecoration.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "mall_products", key: "id" },
    },
    decoration_type: {
      type: DataTypes.ENUM("avatar_frame", "profile_background", "study_room_skin"),
      allowNull: false,
      comment: "装扮类型",
    },
    is_equipped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "是否装备中",
    },
    obtained_at: { type: DataTypes.DATE, allowNull: false, comment: "获得时间" },
  },
  {
    sequelize,
    modelName: "UserDecoration",
    tableName: "user_decorations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["user_id", "product_id"] },
      { fields: ["user_id", "decoration_type"] },
      { fields: ["user_id", "is_equipped"] },
    ],
  }
);

export default UserDecoration;
