import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface DailyQuestionAnswerAttributes {
  id: number;
  user_id: number;
  date: string;
  question_id: number;
  user_answer: string | null;
  is_correct: number | null;
  points_earned: number;
  created_at: Date;
  updated_at: Date;
}

interface DailyQuestionAnswerCreationAttributes
  extends Optional<DailyQuestionAnswerAttributes, "id" | "user_answer" | "is_correct" | "points_earned" | "created_at" | "updated_at"> {}

class DailyQuestionAnswer
  extends Model<DailyQuestionAnswerAttributes, DailyQuestionAnswerCreationAttributes>
  implements DailyQuestionAnswerAttributes
{
  public id!: number;
  public user_id!: number;
  public date!: string;
  public question_id!: number;
  public user_answer!: string | null;
  public is_correct!: number | null;
  public points_earned!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

DailyQuestionAnswer.init(
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "日期",
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "分配的题目ID",
      references: {
        model: "questions",
        key: "id",
      },
    },
    user_answer: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
      comment: "用户提交的答案",
    },
    is_correct: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: null,
      comment: "是否正确：1正确 0错误 null未作答",
    },
    points_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "获得的积分",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "DailyQuestionAnswer",
    tableName: "daily_question_answers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id", "date"], unique: true },
      { fields: ["user_id"] },
      { fields: ["question_id"] },
      { fields: ["date"] },
    ],
  },
);

export default DailyQuestionAnswer;
