import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface QuestionPostAttributes {
  id: number;
  question_id: number;
  user_id: number;
  title: string;
  content: string;
  view_count: number;
  reply_count: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface QuestionPostCreationAttributes
  extends Optional<QuestionPostAttributes, "id" | "created_at" | "updated_at" | "view_count" | "reply_count" | "status"> {}

class QuestionPost
  extends Model<QuestionPostAttributes, QuestionPostCreationAttributes>
  implements QuestionPostAttributes
{
  public id!: number;
  public question_id!: number;
  public user_id!: number;
  public title!: string;
  public content!: string;
  public view_count!: number;
  public reply_count!: number;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

QuestionPost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "关联题目ID",
      references: {
        model: "questions",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "创建者用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "讨论帖标题",
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "讨论帖内容",
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "浏览量",
    },
    reply_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "回复数",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-正常, 0-已关闭, 2-已删除",
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
    modelName: "QuestionPost",
    tableName: "question_posts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["question_id"] },
      { fields: ["user_id"] },
      { fields: ["created_at"] },
    ],
  },
);

export default QuestionPost;
