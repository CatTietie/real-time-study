import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface DocumentAnnotationAttributes {
  id: number;
  document_id: number;
  user_id: number;
  content: string;
  page_number: number;
  position_x: number;
  position_y: number;
  highlight_rects: string | null;
  quoted_text: string | null;
  parent_id: number | null;
  status: "active" | "resolved";
  created_at: Date;
  updated_at: Date;
}

interface DocumentAnnotationCreationAttributes
  extends Optional<DocumentAnnotationAttributes, "id" | "highlight_rects" | "quoted_text" | "parent_id" | "status" | "created_at" | "updated_at"> {}

class DocumentAnnotation
  extends Model<DocumentAnnotationAttributes, DocumentAnnotationCreationAttributes>
  implements DocumentAnnotationAttributes
{
  public id!: number;
  public document_id!: number;
  public user_id!: number;
  public content!: string;
  public page_number!: number;
  public position_x!: number;
  public position_y!: number;
  public highlight_rects!: string | null;
  public quoted_text!: string | null;
  public parent_id!: number | null;
  public status!: "active" | "resolved";
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

DocumentAnnotation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    document_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "knowledge_documents",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    page_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    position_x: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    position_y: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    highlight_rects: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quoted_text: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "document_annotations",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("active", "resolved"),
      allowNull: false,
      defaultValue: "active",
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
    tableName: "document_annotations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["document_id", "page_number", "status"] },
      { fields: ["user_id"] },
      { fields: ["parent_id"] },
    ],
  }
);

export default DocumentAnnotation;
