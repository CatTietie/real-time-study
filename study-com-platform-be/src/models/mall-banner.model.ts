import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class MallBanner extends Model {
  public id!: number;
  public title!: string;
  public image!: string;
  public link_type!: "product" | "external" | "none";
  public link_value!: string | null;
  public sort_order!: number;
  public status!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

MallBanner.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(100), allowNull: false, comment: "横幅标题" },
    image: { type: DataTypes.STRING(500), allowNull: false, comment: "横幅图片URL" },
    link_type: {
      type: DataTypes.ENUM("product", "external", "none"),
      defaultValue: "none",
      comment: "链接类型",
    },
    link_value: { type: DataTypes.STRING(500), comment: "商品ID或外链" },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0, comment: "排序" },
    status: { type: DataTypes.TINYINT, defaultValue: 1, comment: "1=显示 0=隐藏" },
  },
  {
    sequelize,
    modelName: "MallBanner",
    tableName: "mall_banners",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["status", "sort_order"] }],
  }
);

export default MallBanner;
