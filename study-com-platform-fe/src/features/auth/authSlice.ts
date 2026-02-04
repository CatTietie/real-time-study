import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "admin" | "student" | "super_admin";

interface AuthState {
  token: string | null;
  role: UserRole | null;
  username: string | null;
}

const tokenFromStorage = localStorage.getItem("token");
const roleFromStorage = localStorage.getItem("role") as UserRole | null;
const usernameFromStorage = localStorage.getItem("username");

const initialState: AuthState = {
  token: tokenFromStorage,
  role: roleFromStorage,
  username: usernameFromStorage,
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
      }>,
    ) => {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.username = action.payload.username;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("role", action.payload.role);
      localStorage.setItem("username", action.payload.username);
    },
    logout: (state) => {
      state.token = null;
      state.role = null;
      state.username = null;
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
