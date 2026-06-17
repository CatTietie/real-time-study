import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class AuditConfig extends Model {
  public id!: number;
  public audit_mode!: "full" | "smart" | "off";
  public new_user_days_threshold!: number;
  public auto_approve_hours!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

AuditConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    audit_mode: {
      type: DataTypes.ENUM("full", "smart", "off"),
      allowNull: false,
      defaultValue: "smart",
      comment: "审核模式：full=全量审核, smart=智能审核, off=关闭审核",
    },
    new_user_days_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: "新用户天数阈值（注册N天内视为新用户，需审核）",
    },
    auto_approve_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "自动通过小时数（待审帖子超过N小时自动通过，0=禁用）",
    },
  },
  {
    sequelize,
    modelName: "AuditConfig",
    tableName: "audit_configs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

// 缓存
let configCache: { data: AuditConfig; expiredAt: number } | null = null;
const CACHE_TTL = 60 * 1000;

export async function getAuditConfig(): Promise<AuditConfig> {
  if (configCache && Date.now() < configCache.expiredAt) {
    return configCache.data;
  }

  let config = await AuditConfig.findOne({ where: { id: 1 } });
  if (!config) {
    config = await AuditConfig.create({
      audit_mode: "smart",
      new_user_days_threshold: 7,
      auto_approve_hours: 0,
    });
  }

  configCache = { data: config, expiredAt: Date.now() + CACHE_TTL };
  return config;
}

export function clearAuditConfigCache() {
  configCache = null;
}

export default AuditConfig;
