import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface DocumentVersionAttributes {
  id: number;
  document_id: number;
  version_number: number;
  original_url: string;
  preview_url: string | null;
  file_size: number;
  content_text: string | null;
  change_summary: string | null;
  creator_id: number;
  created_at: Date;
}

interface DocumentVersionCreationAttributes
  extends Optional<DocumentVersionAttributes, "id" | "preview_url" | "content_text" | "change_summary" | "created_at"> {}

class DocumentVersion
  extends Model<DocumentVersionAttributes, DocumentVersionCreationAttributes>
  implements DocumentVersionAttributes
{
  public id!: number;
  public document_id!: number;
  public version_number!: number;
  public original_url!: string;
  public preview_url!: string | null;
  public file_size!: number;
  public content_text!: string | null;
  public change_summary!: string | null;
  public creator_id!: number;
  public readonly created_at!: Date;
}

DocumentVersion.init(
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
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    original_url: {
      type: DataTypes.STRING(1024),
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
    change_summary: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "document_versions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["document_id", "version_number"] },
      { fields: ["document_id", "created_at"] },
    ],
  }
);

export default DocumentVersion;
