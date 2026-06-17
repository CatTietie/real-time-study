import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

class UserNodeProgress extends Model<InferAttributes<UserNodeProgress>, InferCreationAttributes<UserNodeProgress>> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare node_id: number;
  declare is_unlocked: CreationOptional<number>;
  declare unlocked_at: CreationOptional<Date | null>;
  declare updated_at: CreationOptional<Date>;
}

UserNodeProgress.init(
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
    node_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "节点ID",
      references: { model: "path_nodes", key: "id" }
    },
    is_unlocked: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "是否已解锁: 0-未解锁, 1-已解锁"
    },
    unlocked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "解锁时间"
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
    tableName: "user_node_progress",
    timestamps: false,
    indexes: [
      { name: "idx_user_id", fields: ["user_id"] },
      { name: "idx_node_id", fields: ["node_id"] },
      {
        name: "uk_user_node",
        unique: true,
        fields: ["user_id", "node_id"]
      }
    ]
  }
);

export default UserNodeProgress;
