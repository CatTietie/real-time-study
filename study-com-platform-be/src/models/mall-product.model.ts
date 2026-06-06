import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class MallProduct extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public image!: string;
  public type!: "virtual_decoration" | "virtual_privilege" | "physical";
  public sub_type!: string | null;
  public points_price!: number;
  public stock!: number;
  public daily_exchange_limit!: number | null;
  public total_limit!: number | null;
  public exchange_start_time!: Date | null;
  public exchange_end_time!: Date | null;
  public status!: "on_sale" | "off_sale";
  public sort_order!: number;
  public exchange_count!: number;
  public created_by!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

MallProduct.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false, comment: "商品名称" },
    description: { type: DataTypes.TEXT, comment: "商品描述" },
    image: { type: DataTypes.STRING(500), comment: "商品图片URL" },
    type: {
      type: DataTypes.ENUM("virtual_decoration", "virtual_privilege", "physical"),
      allowNull: false,
      comment: "商品类型",
    },
    sub_type: {
      type: DataTypes.STRING(50),
      comment: "子类型: avatar_frame/profile_background/study_room_skin",
    },
    points_price: { type: DataTypes.INTEGER, allowNull: false, comment: "积分价格" },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: "库存" },
    daily_exchange_limit: { type: DataTypes.INTEGER, comment: "每用户每日兑换上限" },
    total_limit: { type: DataTypes.INTEGER, comment: "每用户总兑换上限" },
    exchange_start_time: { type: DataTypes.DATE, comment: "兑换开始时间" },
    exchange_end_time: { type: DataTypes.DATE, comment: "兑换结束时间" },
    status: {
      type: DataTypes.ENUM("on_sale", "off_sale"),
      defaultValue: "off_sale",
      comment: "上架状态",
    },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0, comment: "排序" },
    exchange_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: "总兑换次数" },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "创建管理员ID",
      references: { model: "users", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "MallProduct",
    tableName: "mall_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["status"] },
      { fields: ["type"] },
      { fields: ["sort_order"] },
      { fields: ["exchange_count"] },
    ],
  }
);

export default MallProduct;
