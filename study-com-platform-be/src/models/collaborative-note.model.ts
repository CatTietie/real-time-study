import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

class CollaborativeNote extends Model {
  public id!: number;
  public title!: string;
  public content_html!: string | null;
  public content_yjs!: Buffer | null;
  public creator_id!: number;
  public room_id!: number | null;
  public status!: "active" | "archived";
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CollaborativeNote.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "未命名文档",
    },
    content_html: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    content_yjs: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "archived"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    tableName: "collaborative_notes",
    timestamps: true,
    underscored: true,
  }
);

export default CollaborativeNote;
