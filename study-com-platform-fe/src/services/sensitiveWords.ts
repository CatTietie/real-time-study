import api from "./api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type SensitiveWordPayload = {
  word: string;
  category?: string;
  level?: number;
  status?: number;
};

export const fetchSensitiveWords = async (params?: QueryParams) => {
  const response = await api.get("/admin/sensitive-words", { params });
  return response.data;
};

export const createSensitiveWord = async (payload: SensitiveWordPayload) => {
  const response = await api.post("/admin/sensitive-words", payload);
  return response.data;
};

export const updateSensitiveWord = async (
  id: number,
  payload: SensitiveWordPayload,
) => {
  const response = await api.put(`/admin/sensitive-words/${id}`, payload);
  return response.data;
};

export const deleteSensitiveWord = async (id: number) => {
  const response = await api.delete(`/admin/sensitive-words/${id}`);
  return response.data;
};

export const updateSensitiveWordStatus = async (id: number, status: number) => {
  const response = await api.patch(`/admin/sensitive-words/${id}/status`, {
    status,
  });
  return response.data;
};
