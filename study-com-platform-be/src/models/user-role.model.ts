// 用户-角色关联模型（RBAC）
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class UserRole extends Model {
  public id!: number;
  public user_id!: number;
  public role_id!: number;
  public createdAt!: Date;
}

UserRole.init(
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
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "角色ID",
      references: {
        model: "roles",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "UserRole",
    tableName: "user_roles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { unique: true, fields: ["user_id"] },
      { fields: ["user_id"] },
      // { fields: ["role_id"] },
    ],
  },
);

export default UserRole;
