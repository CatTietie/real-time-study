import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize";
import MallProduct from "../models/mall-product.model";
import MallOrder from "../models/mall-order.model";
import MallBanner from "../models/mall-banner.model";
import UserDecoration from "../models/user-decoration.model";
import PointsLog from "../models/points-log.model";
import User from "../models/user.model";

interface ShippingInfo {
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
}

interface ProductListParams {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  keyword?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

function generateOrderNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MALL${date}${rand}`;
}

export async function listProducts(params: ProductListParams) {
  const {
    page = 1,
    pageSize = 12,
    type,
    status,
    keyword,
    min_price,
    max_price,
    sort_by = "sort_order",
    sort_order = "asc",
  } = params;

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (keyword) where.name = { [Op.like]: `%${keyword}%` };
  if (min_price !== undefined || max_price !== undefined) {
    where.points_price = {};
    if (min_price !== undefined) where.points_price[Op.gte] = min_price;
    if (max_price !== undefined) where.points_price[Op.lte] = max_price;
  }

  const order: any[] = [];
  if (sort_by === "popular") {
    order.push(["exchange_count", "DESC"]);
  } else if (sort_by === "price") {
    order.push(["points_price", sort_order === "desc" ? "DESC" : "ASC"]);
  } else {
    order.push(["sort_order", "ASC"], ["created_at", "DESC"]);
  }

  const { rows, count } = await MallProduct.findAndCountAll({
    where,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return { rows, total: count };
}

export async function getProductDetail(id: number) {
  return MallProduct.findByPk(id);
}

export async function getHotProducts(limit = 10) {
  return MallProduct.findAll({
    where: { status: "on_sale" },
    order: [["exchange_count", "DESC"]],
    limit,
  });
}

export async function createProduct(data: any, adminId: number) {
  return MallProduct.create({ ...data, created_by: adminId });
}

export async function updateProduct(id: number, data: any) {
  const product = await MallProduct.findByPk(id);
  if (!product) throw new Error("商品不存在");
  await product.update(data);
  return product;
}

export async function deleteProduct(id: number) {
  const product = await MallProduct.findByPk(id);
  if (!product) throw new Error("商品不存在");
  const orderCount = await MallOrder.count({ where: { product_id: id } });
  if (orderCount > 0) throw new Error("该商品已有兑换记录，无法删除");
  await product.destroy();
}

export async function toggleProductStatus(id: number, status: "on_sale" | "off_sale") {
  const product = await MallProduct.findByPk(id);
  if (!product) throw new Error("商品不存在");
  await product.update({ status });
  return product;
}

async function checkDailyLimit(userId: number, productId: number, dailyLimit: number, transaction: Transaction): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await MallOrder.count({
    where: {
      user_id: userId,
      product_id: productId,
      created_at: { [Op.gte]: startOfDay },
      status: { [Op.ne]: "cancelled" },
    },
    transaction,
  });
  return count < dailyLimit;
}

async function checkTotalLimit(userId: number, productId: number, totalLimit: number, transaction: Transaction): Promise<boolean> {
  const count = await MallOrder.count({
    where: {
      user_id: userId,
      product_id: productId,
      status: { [Op.ne]: "cancelled" },
    },
    transaction,
  });
  return count < totalLimit;
}

export async function exchangeProduct(userId: number, productId: number, shippingInfo?: ShippingInfo) {
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, { transaction });
    if (!user) throw new Error("用户不存在");

    const product = await MallProduct.findByPk(productId, { transaction });
    if (!product) throw new Error("商品不存在");
    if (product.status !== "on_sale") throw new Error("商品未上架");

    const now = new Date();
    if (product.exchange_start_time && now < new Date(product.exchange_start_time)) {
      throw new Error("兑换尚未开始");
    }
    if (product.exchange_end_time && now > new Date(product.exchange_end_time)) {
      throw new Error("兑换已结束");
    }

    if ((user as any).points < product.points_price) {
      throw new Error("积分不足");
    }

    if (product.daily_exchange_limit) {
      const allowed = await checkDailyLimit(userId, productId, product.daily_exchange_limit, transaction);
      if (!allowed) throw new Error("今日兑换次数已达上限");
    }

    if (product.total_limit) {
      const allowed = await checkTotalLimit(userId, productId, product.total_limit, transaction);
      if (!allowed) throw new Error("该商品兑换次数已达上限");
    }

    if (product.type === "physical" && !shippingInfo) {
      throw new Error("实物商品需要填写收货信息");
    }

    // 通过 WHERE 条件原子扣减库存，防止超卖
    const [stockRows] = await MallProduct.update(
      { stock: sequelize.literal("stock - 1") },
      {
        where: { id: productId, stock: { [Op.gt]: 0 } },
        transaction,
      }
    );
    if (stockRows === 0) throw new Error("库存不足");

    // 通过 WHERE 条件原子扣减积分，防止余额不足时多扣
    const [pointsRows] = await User.update(
      { points: sequelize.literal(`points - ${product.points_price}`) },
      {
        where: { id: userId, points: { [Op.gte]: product.points_price } },
        transaction,
      }
    );
    if (pointsRows === 0) throw new Error("积分不足");

    await MallProduct.increment("exchange_count", { where: { id: productId }, transaction });

    await PointsLog.create(
      {
        user_id: userId,
        change: -product.points_price,
        reason: `兑换商品: ${product.name}`,
        source_type: "exchange",
        source_id: productId,
      },
      { transaction }
    );

    const isVirtual = product.type !== "physical";
    const order = await MallOrder.create(
      {
        order_no: generateOrderNo(),
        user_id: userId,
        product_id: productId,
        product_snapshot: {
          name: product.name,
          image: product.image,
          type: product.type,
          sub_type: product.sub_type,
          points_price: product.points_price,
        },
        points_cost: product.points_price,
        status: isVirtual ? "completed" : "pending_shipment",
        completed_at: isVirtual ? new Date() : null,
        ...(shippingInfo || {}),
      },
      { transaction }
    );

    if (product.type === "virtual_decoration" && product.sub_type) {
      await UserDecoration.findOrCreate({
        where: { user_id: userId, product_id: productId },
        defaults: {
          user_id: userId,
          product_id: productId,
          decoration_type: product.sub_type as any,
          is_equipped: false,
          obtained_at: new Date(),
        },
        transaction,
      });
    }

    await transaction.commit();
    return order;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getUserOrders(userId: number, params: { page?: number; pageSize?: number; status?: string }) {
  const { page = 1, pageSize = 10, status } = params;
  const where: any = { user_id: userId };
  if (status) where.status = status;

  const { rows, count } = await MallOrder.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    include: [{ model: MallProduct, attributes: ["id", "name", "image", "type"] }],
  });
  return { rows, total: count };
}

export async function getAdminOrders(params: { page?: number; pageSize?: number; status?: string; keyword?: string }) {
  const { page = 1, pageSize = 10, status, keyword } = params;
  const where: any = {};
  if (status) where.status = status;

  const include: any[] = [
    { model: MallProduct, attributes: ["id", "name", "image", "type"] },
    { model: User, attributes: ["id", "nickname", "username"] },
  ];

  if (keyword) {
    where[Op.or] = [
      { order_no: { [Op.like]: `%${keyword}%` } },
      { shipping_name: { [Op.like]: `%${keyword}%` } },
    ];
  }

  const { rows, count } = await MallOrder.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    include,
  });
  return { rows, total: count };
}

export async function shipOrder(orderId: number, trackingCompany: string, trackingNumber: string) {
  const order = await MallOrder.findByPk(orderId);
  if (!order) throw new Error("订单不存在");
  if (order.status !== "pending_shipment") throw new Error("订单状态不正确");
  await order.update({
    status: "shipped",
    tracking_company: trackingCompany,
    tracking_number: trackingNumber,
    shipped_at: new Date(),
  });
  return order;
}

export async function completeOrder(orderId: number) {
  const order = await MallOrder.findByPk(orderId);
  if (!order) throw new Error("订单不存在");
  if (order.status !== "shipped") throw new Error("订单状态不正确");
  await order.update({ status: "completed", completed_at: new Date() });
  return order;
}

export async function getUserDecorations(userId: number) {
  return UserDecoration.findAll({
    where: { user_id: userId },
    include: [{ model: MallProduct, attributes: ["id", "name", "image", "type", "sub_type", "description"] }],
    order: [["obtained_at", "DESC"]],
  });
}

export async function equipDecoration(userId: number, decorationId: number) {
  const decoration = await UserDecoration.findOne({
    where: { id: decorationId, user_id: userId },
  });
  if (!decoration) throw new Error("装扮不存在");

  await UserDecoration.update(
    { is_equipped: false },
    { where: { user_id: userId, decoration_type: decoration.decoration_type, is_equipped: true } }
  );

  await decoration.update({ is_equipped: true });
  return decoration;
}

export async function unequipDecoration(userId: number, decorationId: number) {
  const decoration = await UserDecoration.findOne({
    where: { id: decorationId, user_id: userId },
  });
  if (!decoration) throw new Error("装扮不存在");
  await decoration.update({ is_equipped: false });
  return decoration;
}

export async function listBanners(activeOnly = true) {
  const where: any = {};
  if (activeOnly) where.status = 1;
  return MallBanner.findAll({ where, order: [["sort_order", "ASC"]] });
}

export async function createBanner(data: any) {
  return MallBanner.create(data);
}

export async function updateBanner(id: number, data: any) {
  const banner = await MallBanner.findByPk(id);
  if (!banner) throw new Error("轮播图不存在");
  await banner.update(data);
  return banner;
}

export async function deleteBanner(id: number) {
  const banner = await MallBanner.findByPk(id);
  if (!banner) throw new Error("轮播图不存在");
  await banner.destroy();
}

export async function getMallStats() {
  const totalProducts = await MallProduct.count();
  const onSaleProducts = await MallProduct.count({ where: { status: "on_sale" } });
  const totalOrders = await MallOrder.count();
  const pendingOrders = await MallOrder.count({ where: { status: "pending_shipment" } });
  const totalExchangePoints = (await MallOrder.sum("points_cost", { where: { status: { [Op.ne]: "cancelled" } } })) || 0;

  return { totalProducts, onSaleProducts, totalOrders, pendingOrders, totalExchangePoints };
}
