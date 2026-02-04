import { createSlice } from "@reduxjs/toolkit";

interface UIState {
  siderCollapsed: boolean;
}

const initialState: UIState = {
  siderCollapsed: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSider: (state) => {
      state.siderCollapsed = !state.siderCollapsed;
    },
    setSiderCollapsed: (state, action: { payload: boolean }) => {
      state.siderCollapsed = action.payload;
    },
  },
});

export const { toggleSider, setSiderCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
