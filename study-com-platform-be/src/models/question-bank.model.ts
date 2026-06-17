import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface QuestionBankAttributes {
  id: number;
  name: string;
  category_id: number;
  description?: string;
  question_count: number;
  difficulty: number;
  rating: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface QuestionBankCreationAttributes
  extends Optional<QuestionBankAttributes, "id" | "created_at" | "updated_at" | "question_count" | "difficulty" | "rating" | "status"> {}

class QuestionBank
  extends Model<QuestionBankAttributes, QuestionBankCreationAttributes>
  implements QuestionBankAttributes
{
  public id!: number;
  public name!: string;
  public category_id!: number;
  public description?: string;
  public question_count!: number;
  public difficulty!: number;
  public rating!: number;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

QuestionBank.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "题库名称",
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "所属分类ID",
      references: {
        model: "categories",
        key: "id",
      },
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: "题库描述",
    },
    question_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "题目数量",
    },
    difficulty: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: "总难度系数（1-5）",
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 5.0,
      comment: "好评度（1-5）",
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
    modelName: "QuestionBank",
    tableName: "question_banks",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["category_id"] },
      { fields: ["difficulty"] },
      { fields: ["rating"] },
    ],
  },
);

export default QuestionBank;
