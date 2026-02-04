// 内容审核记录模型（用于帖子/评论审核留痕）
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ContentAudit extends Model {
  public id!: number;
  public target_type!: "post" | "comment";
  public target_id!: number;
  public status!: number;
  public reason?: string;
  public admin_id!: number;
  public createdAt!: Date;
}

ContentAudit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    target_type: {
      type: DataTypes.ENUM("post", "comment"),
      allowNull: false,
      comment: "审核对象类型",
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "审核对象ID",
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      comment: "审核结果：1-通过, 2-驳回",
    },
    reason: {
      type: DataTypes.STRING(255),
      comment: "审核原因",
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "审核管理员ID",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "ContentAudit",
    tableName: "content_audits",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["target_type"] },
      { fields: ["target_id"] },
      { fields: ["admin_id"] },
      { fields: ["created_at"] },
    ],
  },
);

export default ContentAudit;
