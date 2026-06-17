import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface WrongBookAttributes {
  id: number;
  user_id: number;
  question_id: number;
  wrong_count: number;
  last_wrong_time: Date;
  created_at: Date;
  updated_at: Date;
}

interface WrongBookCreationAttributes
  extends Optional<WrongBookAttributes, "id" | "created_at" | "updated_at" | "wrong_count"> {}

class WrongBook
  extends Model<WrongBookAttributes, WrongBookCreationAttributes>
  implements WrongBookAttributes
{
  public id!: number;
  public user_id!: number;
  public question_id!: number;
  public wrong_count!: number;
  public last_wrong_time!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

WrongBook.init(
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
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "题目ID",
      references: {
        model: "questions",
        key: "id",
      },
    },
    wrong_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: "错误次数",
    },
    last_wrong_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "最近错误时间",
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
    modelName: "WrongBook",
    tableName: "wrong_books",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["question_id"] },
      { fields: ["user_id", "question_id"], unique: true },
      { fields: ["wrong_count"] },
    ],
  },
);

export default WrongBook;
