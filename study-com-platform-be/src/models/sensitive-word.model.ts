// 敏感词库数据模型
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class SensitiveWord extends Model {
  public id!: number;
  public word!: string;
  public category?: string;
  public status!: number;
  public level!: number;
  public createdAt!: Date;
}

SensitiveWord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    word: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: "违禁词条",
    },
    category: {
      type: DataTypes.STRING(50),
      comment: "分类：政治、色情、暴力等",
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "状态：1-启用, 0-禁用",
    },
    level: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "等级：1-拦截, 2-提示, 3-复审",
    },
  },
  {
    sequelize,
    modelName: "SensitiveWord",
    tableName: "sensitive_words",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["status"] }, { fields: ["level"] }],
  },
);

export default SensitiveWord;
