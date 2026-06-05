import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface UserLoginLogAttributes {
  id: number;
  user_id: number;
  ip: string;
  province: string | null;
  created_at: Date;
}

interface UserLoginLogCreationAttributes
  extends Optional<UserLoginLogAttributes, "id" | "created_at" | "province"> {}

class UserLoginLog
  extends Model<UserLoginLogAttributes, UserLoginLogCreationAttributes>
  implements UserLoginLogAttributes
{
  public id!: number;
  public user_id!: number;
  public ip!: string;
  public province!: string | null;
  public created_at!: Date;
}

UserLoginLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "user_login_logs",
    timestamps: false,
    indexes: [
      { fields: ["province", "created_at"] },
      { fields: ["created_at"] },
    ],
  }
);

export default UserLoginLog;
