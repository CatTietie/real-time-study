// 积分流水数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class PointsLog extends Model {
  public id!: number;
  public user_id!: number;
  public change!: number;
  public reason!: string;
  public source_type!: "post" | "comment" | "like" | "task" | "study" | "report" | "admin" | "system" | "remark";
  public source_id?: number;
  public admin_id?: number;
  public createdAt!: Date;
}
PointsLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "用户ID",
      references: {
        model: "users",
        key: "id",
      },
    },
    change: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "积分变动（可正可负）",
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "变动原因",
    },
    source_type: {
      type: DataTypes.ENUM("post", "comment", "like", "task", "study", "report", "admin", "system", "remark"),
      allowNull: false,
      comment: "来源类型",
    },
    source_id: {
      type: DataTypes.INTEGER,
      comment: "来源ID",
    },
    admin_id: {
      type: DataTypes.INTEGER,
      comment: "管理员ID（人工调整时记录）",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "PointsLog",
    tableName: "points_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["source_type"] },
      { fields: ["source_id"] },
      { fields: ["created_at"] },
    ],
  },
);

export default PointsLog;
