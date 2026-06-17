import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

class PathNodeResource extends Model<InferAttributes<PathNodeResource>, InferCreationAttributes<PathNodeResource>> {
  declare id: CreationOptional<number>;
  declare node_id: number;
  declare resource_type: string;
  declare resource_id: CreationOptional<number | null>;
  declare title: string;
  declare url: CreationOptional<string | null>;
  declare sort_order: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
}

PathNodeResource.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "资源ID"
    },
    node_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "所属节点ID",
      references: { model: "path_nodes", key: "id" }
    },
    resource_type: {
      type: DataTypes.ENUM("question_bank", "post", "external_link"),
      allowNull: false,
      comment: "资源类型"
    },
    resource_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "资源ID（题库或帖子的ID）"
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: "资源标题"
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "外部链接URL"
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "排序"
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
    tableName: "path_node_resources",
    timestamps: false,
    indexes: [
      { name: "idx_node_id", fields: ["node_id"] }
    ]
  }
);

export default PathNodeResource;
