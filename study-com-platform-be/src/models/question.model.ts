import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface QuestionAttributes {
  id: number;
  bank_id: number;
  type: number;
  content: string;
  options?: string | null;
  answer: string;
  score: number;
  difficulty: number;
  tags?: string;
  analysis?: string;
  resource_url?: string;
  allow_multiple_practice: number;
  like_count: number;
  dislike_count: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface QuestionCreationAttributes
  extends Optional<QuestionAttributes, "id" | "created_at" | "updated_at" | "score" | "difficulty" | "allow_multiple_practice" | "like_count" | "dislike_count" | "status"> {}

class Question
  extends Model<QuestionAttributes, QuestionCreationAttributes>
  implements QuestionAttributes
{
  public id!: number;
  public bank_id!: number;
  public type!: number;
  public content!: string;
  public options?: string;
  public answer!: string;
  public score!: number;
  public difficulty!: number;
  public tags?: string;
  public analysis?: string;
  public resource_url?: string;
  public allow_multiple_practice!: number;
  public like_count!: number;
  public dislike_count!: number;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Question.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "题库ID",
      references: {
        model: "question_banks",
        key: "id",
      },
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      comment: "题型：1-单选, 2-多选, 3-判断, 4-填空, 5-主观, 6-编程",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "题干文本",
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "选项JSON（如：[{\"label\":\"A\",\"text\":\"选项内容\"}]）",
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "答案文本（多选用逗号分隔）",
    },
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: "分值",
    },
    difficulty: {
      type: DataTypes.TINYINT,
      defaultValue: 3,
      comment: "难度：1-很简单, 2-简单, 3-中等, 4-较难, 5-困难",
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "知识点标签（JSON数组字符串）",
    },
    analysis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "题目解析",
    },
    resource_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "相关资源URL（图片/音频/视频）",
    },
    allow_multiple_practice: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "允许多次练习：1-是, 0-否",
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "点赞数",
    },
    dislike_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "点踩数",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-启用, 0-禁用",
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
    modelName: "Question",
    tableName: "questions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["bank_id"] },
      { fields: ["type"] },
      { fields: ["difficulty"] },
    ],
  },
);

export default Question;
