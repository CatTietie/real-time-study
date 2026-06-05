import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../config/sequelize";

class LearningPath extends Model<InferAttributes<LearningPath>, InferCreationAttributes<LearningPath>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare cover_image: CreationOptional<string | null>;
  declare status: CreationOptional<number>;
  declare sort_order: CreationOptional<number>;
  declare created_by: CreationOptional<number | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

LearningPath.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: "学习路径ID"
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "路径名称"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "路径描述"
    },
    cover_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "封面图片URL"
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: "状态：0-草稿, 1-已发布, 2-已归档"
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "排序序号"
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "创建管理员ID",
      references: { model: "users", key: "id" }
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
    tableName: "learning_paths",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { name: "idx_status", fields: ["status"] },
      { name: "idx_sort_order", fields: ["sort_order"] }
    ]
  }
);

export default LearningPath;
