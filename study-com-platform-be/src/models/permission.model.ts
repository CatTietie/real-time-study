// 权限点数据模型（RBAC）
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Permission extends Model {
  public id!: number;
  public name!: string;
  public code!: string;
  public module?: string;
  public description?: string;
  public createdAt!: Date;
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: "权限名称",
    },
    code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      comment: "权限标识（用于前后端校验）",
    },
    module: {
      type: DataTypes.STRING(50),
      comment: "所属模块",
    },
    description: {
      type: DataTypes.STRING(255),
      comment: "权限说明",
    },
  },
  {
    sequelize,
    modelName: "Permission",
    tableName: "permissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

export default Permission;
