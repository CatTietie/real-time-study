import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

class UserLearningPath extends Model<InferAttributes<UserLearningPath>, InferCreationAttributes<UserLearningPath>> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare path_id: number;
  declare progress_percent: CreationOptional<number>;
  declare status: CreationOptional<string>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

UserLearningPath.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "记录ID"
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "用户ID",
      references: { model: "users", key: "id" }
    },
    path_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "学习路径ID",
      references: { model: "learning_paths", key: "id" }
    },
    progress_percent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "总体进度百分比(0-100)"
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "abandoned"),
      allowNull: false,
      defaultValue: "active",
      comment: "状态"
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "创建时间"
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "更新时间"
    }
  },
  {
    sequelize,
    tableName: "user_learning_paths",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { name: "idx_user_id", fields: ["user_id"] },
      { name: "idx_path_id", fields: ["path_id"] },
      {
        name: "uk_user_path",
        unique: true,
        fields: ["user_id", "path_id"]
      }
    ]
  }
);

export default UserLearningPath;
