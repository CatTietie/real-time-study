import api from "./api";

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    username: string;
    nickname: string;
    avatar?: string;
    role: "admin" | "student" | "super_admin";
    token: string;
    expiresIn: string;
  };
}

export const adminLogin = async (payload: {
  username: string;
  password: string;
}) => {
  const response = await api.post<LoginResponse>("/admin/login", payload);
  return response.data;
};

export const studentLogin = async (payload: {
  username: string;
  password: string;
}) => {
  const response = await api.post<LoginResponse>("/user/login", payload);
  return response.data;
};

interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    username: string;
    nickname: string;
  };
}

export const registerStudent = async (payload: {
  username: string;
  password: string;
  nickname?: string;
}) => {
  const response = await api.post<RegisterResponse>("/user/register", payload);
  return response.data;
};
