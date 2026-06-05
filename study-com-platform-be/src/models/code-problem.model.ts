import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface CodeProblemAttributes {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit: number;
  memory_limit: number;
  languages: string;
  template_code: string | null;
  sample_input: string | null;
  sample_output: string | null;
  hint: string | null;
  status: "draft" | "published";
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

interface CodeProblemCreationAttributes
  extends Optional<
    CodeProblemAttributes,
    | "id"
    | "time_limit"
    | "memory_limit"
    | "template_code"
    | "sample_input"
    | "sample_output"
    | "hint"
    | "status"
    | "created_at"
    | "updated_at"
  > {}

class CodeProblem
  extends Model<CodeProblemAttributes, CodeProblemCreationAttributes>
  implements CodeProblemAttributes
{
  public id!: number;
  public title!: string;
  public description!: string;
  public difficulty!: "easy" | "medium" | "hard";
  public time_limit!: number;
  public memory_limit!: number;
  public languages!: string;
  public template_code!: string | null;
  public sample_input!: string | null;
  public sample_output!: string | null;
  public hint!: string | null;
  public status!: "draft" | "published";
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CodeProblem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: false,
    },
    time_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    memory_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 128,
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    template_code: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    sample_input: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sample_output: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
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
    modelName: "CodeProblem",
    tableName: "code_problems",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["difficulty"] },
      { fields: ["status"] },
      { fields: ["created_by"] },
      { fields: ["created_at"] },
    ],
  }
);

export default CodeProblem;
