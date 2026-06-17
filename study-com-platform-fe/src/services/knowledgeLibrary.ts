import api from "./api";
import type { CreateAnnotationPayload } from "../types/knowledge-library";

// ===== 文档 =====

export const uploadDocument = (formData: FormData) =>
  api.post("/knowledge-library", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });

export const listDocuments = (params: {
  page?: number;
  pageSize?: number;
  category_id?: string | number;
  file_type?: string;
  status?: string;
  keyword?: string;
}) => api.get("/knowledge-library", { params });

export const searchDocuments = (params: {
  q: string;
  page?: number;
  pageSize?: number;
  category_id?: number;
  file_type?: string;
}) => api.get("/knowledge-library/search", { params });

export const getDocument = (id: number) =>
  api.get(`/knowledge-library/${id}`);

export const downloadDocument = (id: number) =>
  api.get(`/knowledge-library/${id}/download`);

// ===== 分类 =====

export const getCategories = () =>
  api.get("/knowledge-library/categories");

// ===== 版本 =====

export const listVersions = (docId: number) =>
  api.get(`/knowledge-library/${docId}/versions`);

export const getVersion = (docId: number, vid: number) =>
  api.get(`/knowledge-library/${docId}/versions/${vid}`);

export const uploadNewVersion = (docId: number, formData: FormData) =>
  api.post(`/knowledge-library/${docId}/versions`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });

export const restoreVersion = (docId: number, vid: number) =>
  api.post(`/knowledge-library/${docId}/versions/${vid}/restore`);

// ===== 批注 =====

export const listAnnotations = (docId: number, params?: { page_number?: number; status?: string }) =>
  api.get(`/knowledge-library/${docId}/annotations`, { params });

export const createAnnotation = (docId: number, data: CreateAnnotationPayload) =>
  api.post(`/knowledge-library/${docId}/annotations`, data);

export const resolveAnnotation = (docId: number, aid: number) =>
  api.patch(`/knowledge-library/${docId}/annotations/${aid}`, { status: "resolved" });

export const deleteAnnotation = (docId: number, aid: number) =>
  api.delete(`/knowledge-library/${docId}/annotations/${aid}`);

// ===== 权限 =====

export const getMyDocumentPermission = (docId: number) =>
  api.get(`/knowledge-library/${docId}/permissions/me`);

export const getDocumentPermissions = (docId: number) =>
  api.get(`/knowledge-library/${docId}/permissions`);

export const grantDocumentPermission = (
  docId: number,
  data: { target_type: "all" | "role" | "user"; target_id?: number | null; permission_level: string }
) => api.post(`/knowledge-library/${docId}/permissions`, data);

export const batchSetDocumentPermissions = (
  docId: number,
  permissions: Array<{
    target_type: "all" | "role" | "user";
    target_id: number | null;
    permission_level: string;
  }>
) => api.put(`/knowledge-library/${docId}/permissions`, { permissions });

export const revokeDocumentPermission = (docId: number, permId: number) =>
  api.delete(`/knowledge-library/${docId}/permissions/${permId}`);
