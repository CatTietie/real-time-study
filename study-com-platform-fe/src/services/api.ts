import axios from "axios";
import { store } from "../app/store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message || error.message || "请求失败";
    return Promise.reject(new Error(message));
  },
);

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

export { api };
export default api;
