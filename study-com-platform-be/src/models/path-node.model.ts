import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

export interface UnlockCondition {
  type: "check_in_count" | "points" | "exercise_count" | "correct_rate" | "study_duration" | "login_streak";
  operator: ">=" | ">" | "=";
  value: number;
}

class PathNode extends Model<InferAttributes<PathNode>, InferCreationAttributes<PathNode>> {
  declare id: CreationOptional<number>;
  declare path_id: number;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare position_x: CreationOptional<number>;
  declare position_y: CreationOptional<number>;
  declare icon: CreationOptional<string>;
  declare color: CreationOptional<string>;
  declare node_type: CreationOptional<string>;
  declare unlock_conditions: CreationOptional<UnlockCondition[] | null>;
  declare sort_order: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

PathNode.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "节点ID"
    },
    path_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "所属学习路径ID",
      references: { model: "learning_paths", key: "id" }
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "节点标题"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "节点描述"
    },
    position_x: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "画布X坐标"
    },
    position_y: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: "画布Y坐标"
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "BookOutlined",
      comment: "节点图标名"
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "#1890ff",
      comment: "节点颜色"
    },
    node_type: {
      type: DataTypes.ENUM("start", "normal", "milestone", "end"),
      allowNull: false,
      defaultValue: "normal",
      comment: "节点类型"
    },
    unlock_conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "解锁条件JSON数组"
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "排序序号"
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
    tableName: "path_nodes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { name: "idx_path_id", fields: ["path_id"] }
    ]
  }
);

export default PathNode;
