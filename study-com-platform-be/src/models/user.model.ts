// 用户数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class User extends Model {
  public id!: number;
  public username!: string;
  public password!: string;
  public nickname!: string;
  public avatar?: string;
  public role!: "admin" | "student" | "super_admin";
  public points!: number;
  public status!: number;
  public last_login?: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "登录账号（学号/管理员名）",
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "加密存储的密码",
    },
    nickname: {
      type: DataTypes.STRING(50),
      defaultValue: "新用户",
      comment: "用户昵称",
    },
    avatar: {
      type: DataTypes.STRING(255),
      comment: "头像URL路径",
    },
    role: {
      type: DataTypes.ENUM("admin", "student", "super_admin"),
      defaultValue: "student",
      comment: "角色权限：super_admin-超级管理员, admin-管理员, student-学生",
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "社区总积分（用于排行榜）",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "账号状态：1-启用, 0-封禁",
    },
    last_login: {
      type: DataTypes.DATE,
      comment: "最后登录时间",
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["role"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  },
);

export default User;
