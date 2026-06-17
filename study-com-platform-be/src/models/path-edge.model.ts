import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

class PathEdge extends Model<InferAttributes<PathEdge>, InferCreationAttributes<PathEdge>> {
  declare id: CreationOptional<number>;
  declare path_id: number;
  declare source_node_id: number;
  declare target_node_id: number;
  declare created_at: CreationOptional<Date>;
}

PathEdge.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "边ID"
    },
    path_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "所属学习路径ID",
      references: { model: "learning_paths", key: "id" }
    },
    source_node_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "前置节点ID",
      references: { model: "path_nodes", key: "id" }
    },
    target_node_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "目标节点ID",
      references: { model: "path_nodes", key: "id" }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "创建时间"
    }
  },
  {
    sequelize,
    tableName: "path_edges",
    timestamps: false,
    indexes: [
      { name: "idx_path_id", fields: ["path_id"] },
      { name: "idx_source", fields: ["source_node_id"] },
      { name: "idx_target", fields: ["target_node_id"] },
      {
        name: "uk_edge",
        unique: true,
        fields: ["path_id", "source_node_id", "target_node_id"]
      }
    ]
  }
);

export default PathEdge;
