import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class QuestionFeedback extends Model {
  public id!: number;
  public user_id!: number;
  public question_id!: number;
  public feedback_type!: "like" | "dislike";
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

QuestionFeedback.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "反馈用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "题目ID",
      references: {
        model: "questions",
        key: "id",
      },
    },
    feedback_type: {
      type: DataTypes.ENUM("like", "dislike"),
      allowNull: false,
      comment: "反馈类型：like-有价值, dislike-有问题",
    },
  },
  {
    sequelize,
    modelName: "QuestionFeedback",
    tableName: "question_feedbacks",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "question_id"],
      },
      { fields: ["question_id"] },
      { fields: ["user_id"] },
    ],
  },
);

export default QuestionFeedback;
