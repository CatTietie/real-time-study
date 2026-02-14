import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "admin" | "student" | "super_admin";

interface AuthState {
  token: string | null;
  role: UserRole | null;
  username: string | null;
  userId: number | null;
  nickname: string | null;
}

const tokenFromStorage = localStorage.getItem("token");
const roleFromStorage = localStorage.getItem("role") as UserRole | null;
const usernameFromStorage = localStorage.getItem("username");
const userIdFromStorage = localStorage.getItem("userId");
const nicknameFromStorage = localStorage.getItem("nickname");

const initialState: AuthState = {
  token: tokenFromStorage,
  role: roleFromStorage,
  username: usernameFromStorage,
  userId: userIdFromStorage ? Number(userIdFromStorage) : null,
  nickname: nicknameFromStorage,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        role: UserRole;
        username: string;
        userId: number;
        nickname: string;
      }>,
    ) => {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.username = action.payload.username;
      state.userId = action.payload.userId;
      state.nickname = action.payload.nickname;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("role", action.payload.role);
      localStorage.setItem("username", action.payload.username);
      localStorage.setItem("userId", action.payload.userId.toString());
      localStorage.setItem("nickname", action.payload.nickname);
    },
    logout: (state) => {
      state.token = null;
      state.role = null;
      state.username = null;
      state.userId = null;
      state.nickname = null;
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("nickname");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
