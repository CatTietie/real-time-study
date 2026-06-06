import api from "./api";

export const uploadMallImage = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/mall/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
};

export const fetchAdminMallProducts = (params?: Record<string, any>) =>
  api.get("/admin/mall/products", { params }).then((r) => r.data);

export const createMallProduct = (data: Record<string, any>) =>
  api.post("/admin/mall/products", data).then((r) => r.data);

export const updateMallProduct = (id: number, data: Record<string, any>) =>
  api.put(`/admin/mall/products/${id}`, data).then((r) => r.data);

export const deleteMallProduct = (id: number) =>
  api.delete(`/admin/mall/products/${id}`).then((r) => r.data);

export const toggleMallProductStatus = (id: number, status: string) =>
  api.patch(`/admin/mall/products/${id}/status`, { status }).then((r) => r.data);

export const fetchAdminMallOrders = (params?: Record<string, any>) =>
  api.get("/admin/mall/orders", { params }).then((r) => r.data);

export const shipMallOrder = (id: number, data: { tracking_company: string; tracking_number: string }) =>
  api.patch(`/admin/mall/orders/${id}/ship`, data).then((r) => r.data);

export const fetchAdminMallBanners = () =>
  api.get("/admin/mall/banners").then((r) => r.data);

export const createMallBanner = (data: Record<string, any>) =>
  api.post("/admin/mall/banners", data).then((r) => r.data);

export const updateMallBanner = (id: number, data: Record<string, any>) =>
  api.put(`/admin/mall/banners/${id}`, data).then((r) => r.data);

export const deleteMallBanner = (id: number) =>
  api.delete(`/admin/mall/banners/${id}`).then((r) => r.data);

export const fetchMallStats = () =>
  api.get("/admin/mall/stats").then((r) => r.data);
