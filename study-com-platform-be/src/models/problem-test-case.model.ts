import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface ProblemTestCaseAttributes {
  id: number;
  problem_id: number;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface ProblemTestCaseCreationAttributes
  extends Optional<
    ProblemTestCaseAttributes,
    "id" | "is_hidden" | "sort_order" | "created_at" | "updated_at"
  > {}

class ProblemTestCase
  extends Model<ProblemTestCaseAttributes, ProblemTestCaseCreationAttributes>
  implements ProblemTestCaseAttributes
{
  public id!: number;
  public problem_id!: number;
  public input!: string;
  public expected_output!: string;
  public is_hidden!: boolean;
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ProblemTestCase.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    problem_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "code_problems", key: "id" },
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expected_output: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_hidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sort_order: {
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
    modelName: "ProblemTestCase",
    tableName: "problem_test_cases",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["problem_id"] },
      { fields: ["problem_id", "sort_order"] },
    ],
  }
);

export default ProblemTestCase;
