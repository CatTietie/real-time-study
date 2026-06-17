import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface KnowledgeCategoryAttributes {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  sort_order: number;
  icon: string | null;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface KnowledgeCategoryCreationAttributes
  extends Optional<KnowledgeCategoryAttributes, "id" | "parent_id" | "description" | "sort_order" | "icon" | "status" | "created_at" | "updated_at"> {}

class KnowledgeCategory
  extends Model<KnowledgeCategoryAttributes, KnowledgeCategoryCreationAttributes>
  implements KnowledgeCategoryAttributes
{
  public id!: number;
  public parent_id!: number | null;
  public name!: string;
  public description!: string | null;
  public sort_order!: number;
  public icon!: string | null;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

KnowledgeCategory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "knowledge_categories",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
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
    tableName: "knowledge_categories",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["parent_id"] },
      { fields: ["sort_order"] },
    ],
  }
);

export default KnowledgeCategory;
