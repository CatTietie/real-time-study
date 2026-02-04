// 角色-权限关联模型（RBAC）
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class RolePermission extends Model {
  public id!: number;
  public role_id!: number;
  public permission_id!: number;
  public createdAt!: Date;
}

RolePermission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "角色ID",
      references: {
        model: "roles",
        key: "id",
      },
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "权限ID",
      references: {
        model: "permissions",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "RolePermission",
    tableName: "role_permissions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["role_id", "permission_id"] },
      { fields: ["role_id"] },
      { fields: ["permission_id"] },
    ],
  },
);

export default RolePermission;
