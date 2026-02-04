import api from "./api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export const fetchReports = async (params?: QueryParams) => {
  const response = await api.get("/report", { params });
  return response.data;
};
