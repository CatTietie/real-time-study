import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface CodeSubmissionAttributes {
  id: number;
  user_id: number;
  problem_id: number;
  language: "python" | "javascript";
  code: string;
  total_cases: number;
  passed_cases: number;
  status:
    | "pending"
    | "judging"
    | "accepted"
    | "wrong_answer"
    | "error"
    | "timeout";
  score: number;
  execution_time_ms: number;
  created_at: Date;
  updated_at: Date;
}

interface CodeSubmissionCreationAttributes
  extends Optional<
    CodeSubmissionAttributes,
    | "id"
    | "total_cases"
    | "passed_cases"
    | "score"
    | "execution_time_ms"
    | "created_at"
    | "updated_at"
  > {}

class CodeSubmission
  extends Model<CodeSubmissionAttributes, CodeSubmissionCreationAttributes>
  implements CodeSubmissionAttributes
{
  public id!: number;
  public user_id!: number;
  public problem_id!: number;
  public language!: "python" | "javascript";
  public code!: string;
  public total_cases!: number;
  public passed_cases!: number;
  public status!:
    | "pending"
    | "judging"
    | "accepted"
    | "wrong_answer"
    | "error"
    | "timeout";
  public score!: number;
  public execution_time_ms!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CodeSubmission.init(
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
    problem_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "code_problems", key: "id" },
    },
    language: {
      type: DataTypes.ENUM("python", "javascript"),
      allowNull: false,
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    total_cases: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    passed_cases: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "judging",
        "accepted",
        "wrong_answer",
        "error",
        "timeout"
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    execution_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: "CodeSubmission",
    tableName: "code_submissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["problem_id"] },
      { fields: ["user_id", "problem_id"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

export default CodeSubmission;
