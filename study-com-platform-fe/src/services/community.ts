import api from "./api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export const fetchCommunityPosts = async (params?: QueryParams) => {
  const response = await api.get("/admin/community/posts", { params });
  return response.data;
};

export const updateCommunityPostStatus = async (
  id: number,
  payload: { status: number; reason?: string },
) => {
  const response = await api.patch(
    `/admin/community/posts/${id}/status`,
    payload,
  );
  return response.data;
};

export const fetchCommunityComments = async (params?: QueryParams) => {
  const response = await api.get("/admin/community/comments", { params });
  return response.data;
};

export const updateCommunityCommentStatus = async (
  id: number,
  payload: { status: number; reason?: string },
) => {
  const response = await api.patch(
    `/admin/community/comments/${id}/status`,
    payload,
  );
  return response.data;
};

export const fetchCommunityStats = async () => {
  const response = await api.get("/admin/community/stats");
  return response.data;
};

export const fetchCommunityReports = async (params?: QueryParams) => {
  const response = await api.get("/admin/community/reports", { params });
  return response.data;
};

export const handleCommunityReport = async (
  id: number,
  payload: { handleResult?: string; action?: "approve" | "reject" },
) => {
  const response = await api.patch(
    `/admin/community/reports/${id}/handle`,
    payload,
  );
  return response.data;
};
