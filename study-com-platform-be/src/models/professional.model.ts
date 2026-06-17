import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

interface ProfessionalAttributes {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

interface ProfessionalCreationAttributes
  extends Optional<ProfessionalAttributes, "id" | "created_at" | "updated_at" | "sort_order" | "status"> {}

class Professional
  extends Model<ProfessionalAttributes, ProfessionalCreationAttributes>
  implements ProfessionalAttributes
{
  public id!: number;
  public name!: string;
  public description?: string;
  public sort_order!: number;
  public status!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Professional.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: "专业名称（如：计算机类、电商类）",
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "专业描述",
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "排序权重",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-启用, 0-禁用",
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
    modelName: "Professional",
    tableName: "professionals",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default Professional;
