import api from "./api";

export const fetchMallProducts = (params?: Record<string, any>) =>
  api.get("/mall/products", { params }).then((r) => r.data);

export const fetchMallProductDetail = (id: number) =>
  api.get(`/mall/products/${id}`).then((r) => r.data);

export const fetchMallHotProducts = () =>
  api.get("/mall/products/hot").then((r) => r.data);

export const fetchMallBanners = () =>
  api.get("/mall/banners").then((r) => r.data);

export const exchangeProduct = (data: { productId: number; shippingInfo?: { shipping_name: string; shipping_phone: string; shipping_address: string } }) =>
  api.post("/mall/exchange", data).then((r) => r.data);

export const fetchMyMallOrders = (params?: Record<string, any>) =>
  api.get("/mall/orders", { params }).then((r) => r.data);

export const fetchMyDecorations = () =>
  api.get("/mall/decorations").then((r) => r.data);

export const equipDecoration = (id: number) =>
  api.post(`/mall/decorations/${id}/equip`).then((r) => r.data);

export const unequipDecoration = (id: number) =>
  api.post(`/mall/decorations/${id}/unequip`).then((r) => r.data);
