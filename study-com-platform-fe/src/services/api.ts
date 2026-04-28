import axios from "axios";
import { store } from "../app/store";

// 扩展 Error 类型，添加业务错误字段
export interface BusinessError extends Error {
  errorCode?: string;
  data?: any;
  response?: {
    data?: {
      success?: boolean;
      message?: string;
      errorCode?: string;
      data?: any;
    };
    status?: number;
    statusText?: string;
  };
}

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
    const errorData = error?.response?.data;
    const message = errorData?.message || error.message || "请求失败";
    
    // 创建自定义的 BusinessError 对象，保留所有错误信息
    const businessError: BusinessError = new Error(message);
    
    // 保留原始的 response 结构，以便前端可以访问完整的错误数据
    if (error?.response) {
      businessError.response = {
        data: errorData,
        status: error.response.status,
        statusText: error.response.statusText
      };
    }
    
    // 同时直接附加 errorCode 和 data 到 Error 对象上，方便访问
    if (errorData?.errorCode) {
      businessError.errorCode = errorData.errorCode;
    }
    if (errorData?.data) {
      businessError.data = errorData.data;
    }
    
    return Promise.reject(businessError);
  },
);

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

export { api };
export default api;
