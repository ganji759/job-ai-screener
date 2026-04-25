import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../types";
import { clearToken, getToken, setToken } from "../../lib/auth";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string;
  user: User | null;
}

const initialState: AuthState = { token: "", user: null, isAuthenticated: false, loading: false, error: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ token: string; user: User | null }>) => {
      setToken(action.payload.token);
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    register: (state, action: PayloadAction<{ token: string; user: User | null }>) => {
      setToken(action.payload.token);
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    logout: (state) => {
      clearToken();
      state.token = "";
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    loadFromStorage: (state) => {
      const token = getToken();
      state.token = token;
      state.isAuthenticated = Boolean(token);
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { login, register, logout, loadFromStorage, updateProfile, setAuthLoading, setAuthError } = authSlice.actions;
export default authSlice.reducer;
