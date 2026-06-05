import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface KnowledgeDocumentAttributes {
  id: number;
  title: string;
  category_id: number | null;
  uploader_id: number;
  file_type: "pdf" | "word" | "ppt" | "image" | "other";
  original_url: string;
  original_filename: string;
  preview_url: string | null;
  file_size: number;
  content_text: string | null;
  tags: string | null;
  status: "pending_review" | "approved" | "rejected" | "archived";
  download_count: number;
  view_count: number;
  current_version: number;
  created_at: Date;
  updated_at: Date;
}

interface KnowledgeDocumentCreationAttributes
  extends Optional<KnowledgeDocumentAttributes, "id" | "category_id" | "preview_url" | "content_text" | "tags" | "status" | "download_count" | "view_count" | "current_version" | "created_at" | "updated_at"> {}

class KnowledgeDocument
  extends Model<KnowledgeDocumentAttributes, KnowledgeDocumentCreationAttributes>
  implements KnowledgeDocumentAttributes
{
  public id!: number;
  public title!: string;
  public category_id!: number | null;
  public uploader_id!: number;
  public file_type!: "pdf" | "word" | "ppt" | "image" | "other";
  public original_url!: string;
  public original_filename!: string;
  public preview_url!: string | null;
  public file_size!: number;
  public content_text!: string | null;
  public tags!: string | null;
  public status!: "pending_review" | "approved" | "rejected" | "archived";
  public download_count!: number;
  public view_count!: number;
  public current_version!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

KnowledgeDocument.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "knowledge_categories",
        key: "id",
      },
    },
    uploader_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    file_type: {
      type: DataTypes.ENUM("pdf", "word", "ppt", "image", "other"),
      allowNull: false,
    },
    original_url: {
      type: DataTypes.STRING(1024),
      allowNull: false,
    },
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    preview_url: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    content_text: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending_review", "approved", "rejected", "archived"),
      allowNull: false,
      defaultValue: "pending_review",
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    current_version: {
      type: DataTypes.INTEGER,
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
    tableName: "knowledge_documents",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["category_id"] },
      { fields: ["uploader_id"] },
      { fields: ["status"] },
      { fields: ["file_type"] },
    ],
  }
);

export default KnowledgeDocument;
