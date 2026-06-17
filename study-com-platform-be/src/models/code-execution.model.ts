import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface CodeExecutionAttributes {
  id: number;
  user_id: number;
  question_id: number;
  language: string;
  code: string;
  stdin: string | null;
  stdout: string | null;
  stderr: string | null;
  exit_code: number | null;
  execution_time_ms: number | null;
  status: string;
  test_case_index: number | null;
  passed: boolean | null;
  blocked_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CodeExecutionCreationAttributes
  extends Optional<
    CodeExecutionAttributes,
    | "id"
    | "stdin"
    | "stdout"
    | "stderr"
    | "exit_code"
    | "execution_time_ms"
    | "test_case_index"
    | "passed"
    | "blocked_reason"
    | "created_at"
    | "updated_at"
  > {}

class CodeExecution
  extends Model<CodeExecutionAttributes, CodeExecutionCreationAttributes>
  implements CodeExecutionAttributes
{
  public id!: number;
  public user_id!: number;
  public question_id!: number;
  public language!: string;
  public code!: string;
  public stdin!: string | null;
  public stdout!: string | null;
  public stderr!: string | null;
  public exit_code!: number | null;
  public execution_time_ms!: number | null;
  public status!: string;
  public test_case_index!: number | null;
  public passed!: boolean | null;
  public blocked_reason!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CodeExecution.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "questions", key: "id" },
    },
    language: {
      type: DataTypes.ENUM("python", "javascript"),
      allowNull: false,
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    stdin: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stdout: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stderr: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    exit_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    execution_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("success", "error", "timeout", "blocked", "oom"),
      allowNull: false,
    },
    test_case_index: {
      type: DataTypes.TINYINT,
      allowNull: true,
    },
    passed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    blocked_reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
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
    modelName: "CodeExecution",
    tableName: "code_executions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["question_id"] },
      { fields: ["user_id", "question_id"] },
      { fields: ["created_at"] },
    ],
  }
);

export default CodeExecution;
