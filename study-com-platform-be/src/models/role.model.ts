// 角色数据模型（RBAC）
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Role extends Model {
  public id!: number;
  public name!: string;
  public code!: string;
  public description?: string;
  public status!: number;
  public createdAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "角色名称",
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "角色标识（用于权限匹配）",
    },
    description: {
      type: DataTypes.STRING(255),
      comment: "角色描述",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-启用, 0-禁用",
    },
  },
  {
    sequelize,
    modelName: "Role",
    tableName: "roles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["status"] }],
  },
);

export default Role;
