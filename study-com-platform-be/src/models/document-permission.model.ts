import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface DocumentPermissionAttributes {
  id: number;
  document_id: number;
  target_type: "all" | "role" | "user";
  target_id: number | null;
  permission_level: "view" | "comment" | "edit" | "manage";
  granted_by: number;
  created_at: Date;
}

interface DocumentPermissionCreationAttributes
  extends Optional<DocumentPermissionAttributes, "id" | "target_id" | "created_at"> {}

class DocumentPermission
  extends Model<DocumentPermissionAttributes, DocumentPermissionCreationAttributes>
  implements DocumentPermissionAttributes
{
  public id!: number;
  public document_id!: number;
  public target_type!: "all" | "role" | "user";
  public target_id!: number | null;
  public permission_level!: "view" | "comment" | "edit" | "manage";
  public granted_by!: number;
  public readonly created_at!: Date;
}

DocumentPermission.init(
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
    target_type: {
      type: DataTypes.ENUM("all", "role", "user"),
      allowNull: false,
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    permission_level: {
      type: DataTypes.ENUM("view", "comment", "edit", "manage"),
      allowNull: false,
    },
    granted_by: {
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
    tableName: "document_permissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["document_id", "target_type", "target_id"] },
      { fields: ["document_id"] },
    ],
  }
);

export default DocumentPermission;
