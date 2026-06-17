import api from "./api";

// ===== 分类管理 =====

export const adminListCategories = () =>
  api.get("/admin/knowledge/categories");

export const adminCreateCategory = (data: {
  name: string;
  parent_id?: number | null;
  description?: string;
  sort_order?: number;
  icon?: string;
}) => api.post("/admin/knowledge/categories", data);

export const adminUpdateCategory = (id: number, data: {
  name?: string;
  parent_id?: number | null;
  description?: string;
  sort_order?: number;
  icon?: string;
  status?: number;
}) => api.put(`/admin/knowledge/categories/${id}`, data);

export const adminDeleteCategory = (id: number) =>
  api.delete(`/admin/knowledge/categories/${id}`);

// ===== 文档管理 =====

export const adminListDocuments = (params: {
  page?: number;
  pageSize?: number;
  status?: string;
  category_id?: string | number;
  file_type?: string;
  keyword?: string;
}) => api.get("/admin/knowledge/documents", { params });

export const adminAuditDocument = (id: number, data: { status: "approved" | "rejected"; reason?: string }) =>
  api.patch(`/admin/knowledge/documents/${id}/audit`, data);

export const adminBatchMove = (data: { document_ids: number[]; category_id: number | null }) =>
  api.post("/admin/knowledge/documents/batch/move", data);

export const adminBatchDelete = (data: { document_ids: number[] }) =>
  api.post("/admin/knowledge/documents/batch/delete", data);

export const adminGetStats = () =>
  api.get("/admin/knowledge/stats");
