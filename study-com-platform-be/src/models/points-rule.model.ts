// 积分规则模型（可配置积分来源与变化）
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class PointsRule extends Model {
  public id!: number;
  public code!: string;
  public title!: string;
  public change!: number;
  public status!: number;
  public description?: string;
  public createdAt!: Date;
}

PointsRule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "规则编码（用于匹配业务场景）",
    },
    title: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: "规则名称",
    },
    change: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "积分变化值",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-启用, 0-禁用",
    },
    description: {
      type: DataTypes.STRING(255),
      comment: "规则说明",
    },
  },
  {
    sequelize,
    modelName: "PointsRule",
    tableName: "points_rules",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["status"] }],
  },
);

export default PointsRule;
