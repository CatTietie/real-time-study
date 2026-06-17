import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface UserStatsAttributes {
  id: number;
  user_id: number;
  total_questions: number;
  correct_count: number;
  accuracy_rate: number;
  total_points: number;
  created_at: Date;
  updated_at: Date;
}

interface UserStatsCreationAttributes
  extends Optional<UserStatsAttributes, "id" | "created_at" | "updated_at" | "total_questions" | "correct_count" | "accuracy_rate" | "total_points"> {}

class UserStats
  extends Model<UserStatsAttributes, UserStatsCreationAttributes>
  implements UserStatsAttributes
{
  public id!: number;
  public user_id!: number;
  public total_questions!: number;
  public correct_count!: number;
  public accuracy_rate!: number;
  public total_points!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserStats.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: "用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    total_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "累计做题数",
    },
    correct_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "总正确数",
    },
    accuracy_rate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: "正确率（0-100）",
    },
    total_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "练题总积分",
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
    modelName: "UserStats",
    tableName: "user_stats",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"], unique: true },
      { fields: ["total_points"] },
      { fields: ["accuracy_rate"] },
    ],
  },
);

export default UserStats;
