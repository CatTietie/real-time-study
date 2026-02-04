// 管理员日志数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class AdminLog extends Model {
  public id!: number;
  public admin_id!: number;
  public action_type!: string;
  public target_table?: string;
  public target_id?: number;
  public detail?: string;
  public ip_address?: string;
  public createdAt!: Date;
}

AdminLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "执行操作的管理员ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    action_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "操作类型：如 封禁用户、审核帖子",
    },
    target_table: {
      type: DataTypes.STRING(50),
      comment: "被操作的数据表名",
    },
    target_id: {
      type: DataTypes.INTEGER,
      comment: "被操作的数据ID",
    },
    detail: {
      type: DataTypes.TEXT,
      comment: "具体操作描述（记录修改前后的变化）",
    },
    ip_address: {
      type: DataTypes.STRING(45),
      comment: "操作者IP",
    },
  },
  {
    sequelize,
    modelName: "AdminLog",
    tableName: "admin_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["admin_id"] },
      { fields: ["created_at"] },
      { fields: ["target_table"] },
      { fields: ["target_id"] },
    ],
  },
);

export default AdminLog;
