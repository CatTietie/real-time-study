import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface CategoryAttributes {
  id: number;
  professional_id: number;
  parent_id?: number;
  name: string;
  description?: string;
  sort_order: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface CategoryCreationAttributes
  extends Optional<CategoryAttributes, "id" | "created_at" | "updated_at" | "parent_id" | "sort_order" | "status"> {}

class Category
  extends Model<CategoryAttributes, CategoryCreationAttributes>
  implements CategoryAttributes
{
  public id!: number;
  public professional_id!: number;
  public parent_id?: number;
  public name!: string;
  public description?: string;
  public sort_order!: number;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professional_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "所属专业ID",
      references: {
        model: "professionals",
        key: "id",
      },
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "父分类ID（树形结构），NULL表示顶级分类",
      references: {
        model: "categories",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "分类名称",
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "分类描述",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "排序权重",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-启用, 0-禁用",
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
    modelName: "Category",
    tableName: "categories",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["professional_id"] },
      { fields: ["parent_id"] },
    ],
  },
);

export default Category;
