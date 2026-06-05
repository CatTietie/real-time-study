import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface UserTagMasteryAttributes {
  id: number;
  user_id: number;
  tag: string;
  total_count: number;
  correct_count: number;
  mastery_rate: number;
  last_practice_time: Date;
  created_at: Date;
  updated_at: Date;
}

interface UserTagMasteryCreationAttributes
  extends Optional<UserTagMasteryAttributes, "id" | "created_at" | "updated_at" | "total_count" | "correct_count" | "mastery_rate"> {}

class UserTagMastery
  extends Model<UserTagMasteryAttributes, UserTagMasteryCreationAttributes>
  implements UserTagMasteryAttributes
{
  public id!: number;
  public user_id!: number;
  public tag!: string;
  public total_count!: number;
  public correct_count!: number;
  public mastery_rate!: number;
  public last_practice_time!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserTagMastery.init(
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
    tag: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "知识点标签",
    },
    total_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "累计做题数",
    },
    correct_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "累计正确数",
    },
    mastery_rate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: "掌握率 0-100",
    },
    last_practice_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "最近练习时间",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserTagMastery",
    tableName: "user_tag_mastery",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["user_id", "tag"] },
      { fields: ["user_id", "mastery_rate"] },
    ],
  },
);

export default UserTagMastery;
