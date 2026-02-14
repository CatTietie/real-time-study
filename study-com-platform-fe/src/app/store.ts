import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import uiReducer from "../features/ui/uiSlice";

console.log('=== Store 初始化 ===');
const tokenFromStorage = localStorage.getItem("token");
const roleFromStorage = localStorage.getItem("role");
const usernameFromStorage = localStorage.getItem("username");
const userIdFromStorage = localStorage.getItem("userId");
const nicknameFromStorage = localStorage.getItem("nickname");

console.log('localStorage 数据:', {
  token: tokenFromStorage,
  role: roleFromStorage,
  username: usernameFromStorage,
  userId: userIdFromStorage,
  nickname: nicknameFromStorage
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

console.log('初始 state:', store.getState());

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
