import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface UserAnswerDetailAttributes {
  id: number;
  record_id: number;
  question_id: number;
  user_answer?: string;
  is_correct: number;
  earned_points: number;
  review_status: number;
  review_score?: number | null;
  review_comment?: string | null;
  reviewer_id?: number | null;
  reviewed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface UserAnswerDetailCreationAttributes
  extends Optional<UserAnswerDetailAttributes, "id" | "created_at" | "updated_at" | "is_correct" | "earned_points" | "review_status" | "review_score" | "review_comment" | "reviewer_id" | "reviewed_at"> {}

class UserAnswerDetail
  extends Model<UserAnswerDetailAttributes, UserAnswerDetailCreationAttributes>
  implements UserAnswerDetailAttributes
{
  public id!: number;
  public record_id!: number;
  public question_id!: number;
  public user_answer?: string;
  public is_correct!: number;
  public earned_points!: number;
  public review_status!: number;
  public review_score?: number | null;
  public review_comment?: string | null;
  public reviewer_id?: number | null;
  public reviewed_at?: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserAnswerDetail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    record_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "练习记录ID",
      references: {
        model: "user_exercise_records",
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
    user_answer: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "用户答案",
    },
    is_correct: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "是否正确：1-正确, 0-错误",
    },
    earned_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "获得积分",
    },
    review_status: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "批改状态：0-无需批改, 1-待批改, 2-已批改",
    },
    review_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "教师评分",
    },
    review_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "教师评语",
    },
    reviewer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "批改人ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "批改时间",
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
    modelName: "UserAnswerDetail",
    tableName: "user_answer_details",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["record_id"] },
      { fields: ["question_id"] },
      { fields: ["record_id", "question_id"], unique: true },
      { fields: ["review_status"] },
      { fields: ["review_status", "created_at"] },
    ],
  },
);

export default UserAnswerDetail;
