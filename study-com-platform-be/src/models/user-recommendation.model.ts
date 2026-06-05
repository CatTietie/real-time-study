import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class UserRecommendation extends Model {
  public id!: number;
  public user_id!: number;
  public target_type!: "post" | "study_room";
  public target_id!: number;
  public score!: number;
  public reason!: string;
  public status!: "active" | "dismissed";
  public created_at!: Date;
  public expired_at!: Date;
}

UserRecommendation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    target_type: {
      type: DataTypes.ENUM("post", "study_room"),
      allowNull: false,
    },
    target_id: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.FLOAT, defaultValue: 0 },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "dismissed"),
      defaultValue: "active",
    },
    expired_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "UserRecommendation",
    tableName: "user_recommendations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id", "status"] },
      {
        fields: ["user_id", "target_type", "target_id"],
        unique: true,
      },
    ],
  }
);

export default UserRecommendation;
