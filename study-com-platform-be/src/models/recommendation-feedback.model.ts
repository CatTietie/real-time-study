import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class RecommendationFeedback extends Model {
  public id!: number;
  public user_id!: number;
  public recommendation_id!: number;
  public action!: "click" | "favorite" | "dismiss";
  public created_at!: Date;
}

RecommendationFeedback.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    recommendation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "user_recommendations", key: "id" },
    },
    action: {
      type: DataTypes.ENUM("click", "favorite", "dismiss"),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "RecommendationFeedback",
    tableName: "recommendation_feedback",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["recommendation_id"] },
    ],
  }
);

export default RecommendationFeedback;
