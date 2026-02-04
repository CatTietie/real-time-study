// 举报数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Report extends Model {
  public id!: number;
  public reporter_id!: number;
  public target_type!: "post" | "comment";
  public target_id!: number;
  public reason!: string;
  public status!: number;
  public handle_result?: string;
  public handler_admin_id?: number;
  public handled_at?: Date;
  public createdAt!: Date;
}

Report.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "举报人ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    target_type: {
      type: DataTypes.ENUM("post", "comment"),
      allowNull: false,
      comment: "举报对象类型",
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "被举报的对象ID",
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "举报理由（如垃圾广告、人身攻击）",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: "处理状态：0-待处理, 1-已处理",
    },
    handle_result: {
      type: DataTypes.STRING(255),
      comment: "处理结论（如 忽略、删除内容并扣分）",
    },
    handler_admin_id: {
      type: DataTypes.INTEGER,
      comment: "处理管理员ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    handled_at: {
      type: DataTypes.DATE,
      comment: "处理时间",
    },
  },
  {
    sequelize,
    modelName: "Report",
    tableName: "reports",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["status"] },
      { fields: ["target_type"] },
      { fields: ["target_id"] },
      { fields: ["reporter_id"] },
      { fields: ["created_at"] },
    ],
  },
);

export default Report;
