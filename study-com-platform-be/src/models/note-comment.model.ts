import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

class NoteComment extends Model {
  public id!: number;
  public note_id!: number;
  public user_id!: number;
  public content!: string;
  public position_start!: string;
  public position_end!: string;
  public quoted_text!: string | null;
  public parent_id!: number | null;
  public status!: "active" | "resolved";
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

NoteComment.init(
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "评论者用户ID",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "评论内容",
    },
    position_start: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Yjs相对位置（起始）JSON",
    },
    position_end: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Yjs相对位置（结束）JSON",
    },
    quoted_text: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "原始选中文本（位置失效时展示用）",
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "父评论ID（回复场景）",
    },
    status: {
      type: DataTypes.ENUM("active", "resolved"),
      allowNull: false,
      defaultValue: "active",
      comment: "评论状态",
    },
  },
  {
    sequelize,
    tableName: "note_comments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["note_id", "status"] },
      { fields: ["parent_id"] },
    ],
  }
);

export default NoteComment;
