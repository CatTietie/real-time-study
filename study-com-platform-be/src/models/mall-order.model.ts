import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class MallOrder extends Model {
  public id!: number;
  public order_no!: string;
  public user_id!: number;
  public product_id!: number;
  public product_snapshot!: object;
  public points_cost!: number;
  public status!: "pending_shipment" | "shipped" | "completed" | "cancelled";
  public shipping_name!: string | null;
  public shipping_phone!: string | null;
  public shipping_address!: string | null;
  public tracking_company!: string | null;
  public tracking_number!: string | null;
  public shipped_at!: Date | null;
  public completed_at!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

MallOrder.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: "订单号",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "mall_products", key: "id" },
    },
    product_snapshot: { type: DataTypes.JSON, allowNull: false, comment: "商品快照" },
    points_cost: { type: DataTypes.INTEGER, allowNull: false, comment: "花费积分" },
    status: {
      type: DataTypes.ENUM("pending_shipment", "shipped", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "pending_shipment",
    },
    shipping_name: { type: DataTypes.STRING(50), comment: "收货人姓名" },
    shipping_phone: { type: DataTypes.STRING(20), comment: "收货人电话" },
    shipping_address: { type: DataTypes.STRING(500), comment: "收货地址" },
    tracking_company: { type: DataTypes.STRING(50), comment: "快递公司" },
    tracking_number: { type: DataTypes.STRING(100), comment: "快递单号" },
    shipped_at: { type: DataTypes.DATE, comment: "发货时间" },
    completed_at: { type: DataTypes.DATE, comment: "完成时间" },
  },
  {
    sequelize,
    modelName: "MallOrder",
    tableName: "mall_orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["product_id"] },
      { fields: ["status"] },
      { unique: true, fields: ["order_no"] },
      { fields: ["created_at"] },
    ],
  }
);

export default MallOrder;
