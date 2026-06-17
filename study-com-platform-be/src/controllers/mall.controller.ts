import { Request, Response } from "express";
import * as mallService from "../services/mall.service";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 12,
      type: req.query.type as string,
      status: "on_sale",
      keyword: req.query.keyword as string,
      min_price: req.query.min_price ? parseInt(req.query.min_price as string) : undefined,
      max_price: req.query.max_price ? parseInt(req.query.max_price as string) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
    };
    const result = await mallService.listProducts(params);
    res.json({ success: true, data: result.rows, pagination: { total: result.total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductDetail = async (req: Request, res: Response) => {
  try {
    const product = await mallService.getProductDetail(parseInt(req.params.id));
    if (!product) return res.status(404).json({ success: false, message: "商品不存在" });
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHotProducts = async (req: Request, res: Response) => {
  try {
    const products = await mallService.getHotProducts(10);
    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await mallService.listBanners(true);
    res.json({ success: true, data: banners });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exchangeProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { productId, shippingInfo } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: "缺少商品ID" });

    const order = await mallService.exchangeProduct(userId, productId, shippingInfo);
    res.json({ success: true, data: order, message: "兑换成功" });
  } catch (error: any) {
    const status = error.message.includes("不足") || error.message.includes("上限") ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: req.query.status as string,
    };
    const result = await mallService.getUserOrders(userId, params);
    res.json({ success: true, data: result.rows, pagination: { total: result.total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDecorations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const decorations = await mallService.getUserDecorations(userId);
    res.json({ success: true, data: decorations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const equipDecoration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const decorationId = parseInt(req.params.id);
    const result = await mallService.equipDecoration(userId, decorationId);
    res.json({ success: true, data: result, message: "装备成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const unequipDecoration = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const decorationId = parseInt(req.params.id);
    const result = await mallService.unequipDecoration(userId, decorationId);
    res.json({ success: true, data: result, message: "卸下成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
