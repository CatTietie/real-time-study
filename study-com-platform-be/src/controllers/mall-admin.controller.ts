import { Request, Response } from "express";
import * as mallService from "../services/mall.service";
import { ossService } from "../services/oss.service";
import { ossDirectories } from "../config/oss";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File;
    if (!file) return res.status(400).json({ success: false, message: "未选择文件" });

    let url: string;
    if (ossService.isAvailable() && file.buffer) {
      url = await ossService.uploadBuffer(file.buffer, file.originalname, "mall/");
    } else {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      url = `${baseUrl}/uploads/mall/${file.filename}`;
    }

    res.json({ success: true, data: { url } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listProducts = async (req: Request, res: Response) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      type: req.query.type as string,
      status: req.query.status as string,
      keyword: req.query.keyword as string,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
    };
    const result = await mallService.listProducts(params);
    res.json({ success: true, data: result.rows, pagination: { total: result.total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const product = await mallService.createProduct(req.body, adminId);
    res.json({ success: true, data: product, message: "创建成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await mallService.updateProduct(parseInt(req.params.id), req.body);
    res.json({ success: true, data: product, message: "更新成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await mallService.deleteProduct(parseInt(req.params.id));
    res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const product = await mallService.toggleProductStatus(parseInt(req.params.id), status);
    res.json({ success: true, data: product, message: "状态更新成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const listOrders = async (req: Request, res: Response) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: req.query.status as string,
      keyword: req.query.keyword as string,
    };
    const result = await mallService.getAdminOrders(params);
    res.json({ success: true, data: result.rows, pagination: { total: result.total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const shipOrder = async (req: Request, res: Response) => {
  try {
    const { tracking_company, tracking_number } = req.body;
    if (!tracking_company || !tracking_number) {
      return res.status(400).json({ success: false, message: "请填写快递公司和快递单号" });
    }
    const order = await mallService.shipOrder(parseInt(req.params.id), tracking_company, tracking_number);
    res.json({ success: true, data: order, message: "发货成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const listBanners = async (req: Request, res: Response) => {
  try {
    const banners = await mallService.listBanners(false);
    res.json({ success: true, data: banners });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBanner = async (req: Request, res: Response) => {
  try {
    const banner = await mallService.createBanner(req.body);
    res.json({ success: true, data: banner, message: "创建成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  try {
    const banner = await mallService.updateBanner(parseInt(req.params.id), req.body);
    res.json({ success: true, data: banner, message: "更新成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteBanner = async (req: Request, res: Response) => {
  try {
    await mallService.deleteBanner(parseInt(req.params.id));
    res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMallStats = async (req: Request, res: Response) => {
  try {
    const stats = await mallService.getMallStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
