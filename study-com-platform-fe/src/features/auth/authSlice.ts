import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "admin" | "student" | "super_admin";

interface AuthState {
  token: string | null;
  role: UserRole | null;
  username: string | null;
  userId: number | null;
  nickname: string | null;
  avatar: string | null;
}

const tokenFromStorage = localStorage.getItem("token");
const roleFromStorage = localStorage.getItem("role") as UserRole | null;
const usernameFromStorage = localStorage.getItem("username");
const userIdFromStorage = localStorage.getItem("userId");
const nicknameFromStorage = localStorage.getItem("nickname");
const avatarFromStorage = localStorage.getItem("avatar");

const initialState: AuthState = {
  token: tokenFromStorage,
  role: roleFromStorage,
  username: usernameFromStorage,
  userId: userIdFromStorage ? parseInt(userIdFromStorage, 10) : null,
  nickname: nicknameFromStorage,
  avatar: avatarFromStorage,
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
        avatar?: string;
      }>,
    ) => {
      console.log('=== loginSuccess action 执行 ===');
      console.log('payload:', action.payload);
      
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.username = action.payload.username;
      state.userId = action.payload.userId;
      state.nickname = action.payload.nickname;
      state.avatar = action.payload.avatar || null;
      
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("role", action.payload.role);
      localStorage.setItem("username", action.payload.username);
      localStorage.setItem("userId", action.payload.userId.toString());
      localStorage.setItem("nickname", action.payload.nickname);
      if (action.payload.avatar) {
        localStorage.setItem("avatar", action.payload.avatar);
      }
      
      console.log('更新后的 state:', { 
        token: state.token, 
        role: state.role, 
        username: state.username, 
        userId: state.userId, 
        nickname: state.nickname,
        avatar: state.avatar
      });
    },
    updateAvatar: (state, action: PayloadAction<string>) => {
      state.avatar = action.payload;
      localStorage.setItem("avatar", action.payload);
    },
    logout: (state) => {
      state.token = null;
      state.role = null;
      state.username = null;
      state.userId = null;
      state.nickname = null;
      state.avatar = null;
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("nickname");
      localStorage.removeItem("avatar");
    },
  },
});

export const { loginSuccess, updateAvatar, logout } = authSlice.actions;
export default authSlice.reducer;
