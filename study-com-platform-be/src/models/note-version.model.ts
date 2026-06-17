import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

class NoteVersion extends Model {
  public id!: number;
  public note_id!: number;
  public version_number!: number;
  public content_html!: string;
  public content_yjs!: Buffer | null;
  public creator_id!: number;
  public readonly created_at!: Date;
}

NoteVersion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    note_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "关联的协作笔记ID",
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "版本号（递增）",
    },
    content_html: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      comment: "版本HTML快照",
    },
    content_yjs: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
      comment: "Yjs二进制状态（用于恢复）",
    },
    creator_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "触发保存的用户ID",
    },
  },
  {
    sequelize,
    tableName: "note_versions",
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["note_id", "version_number"] },
      { fields: ["note_id", "created_at"] },
    ],
  }
);

export default NoteVersion;
