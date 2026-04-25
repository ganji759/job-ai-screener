import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Notification } from "../../types";

interface ActiveScreening {
  screeningId: string;
  jobTitle: string;
  status: "queued" | "running" | "completed" | "failed";
}

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  variant: "danger" | "warning" | "default";
}

interface UiState {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  globalLoading: boolean;
  notifications: Notification[];
  unreadCount: number;
  activeScreenings: ActiveScreening[];
  activeToasts: ToastItem[];
  confirmDialog: ConfirmDialogState;
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: "light",
  globalLoading: false,
  notifications: [],
  unreadCount: 0,
  activeScreenings: [],
  activeToasts: [],
  confirmDialog: { open: false, title: "", description: "", variant: "default" },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.readAt).length;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      state.unreadCount = state.notifications.filter((n) => !n.readAt).length;
    },
    markRead: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.map((n) => (n._id === action.payload ? { ...n, readAt: new Date().toISOString() } : n));
      state.unreadCount = state.notifications.filter((n) => !n.readAt).length;
    },
    markAllRead: (state) => {
      const now = new Date().toISOString();
      state.notifications = state.notifications.map((n) => ({ ...n, readAt: n.readAt ?? now }));
      state.unreadCount = 0;
    },
    upsertActiveScreening: (state, action: PayloadAction<ActiveScreening>) => {
      const index = state.activeScreenings.findIndex((item) => item.screeningId === action.payload.screeningId);
      if (index >= 0) state.activeScreenings[index] = action.payload;
      else state.activeScreenings.push(action.payload);
    },
    removeActiveScreening: (state, action: PayloadAction<string>) => {
      state.activeScreenings = state.activeScreenings.filter((item) => item.screeningId !== action.payload);
    },
    addToast: (state, action: PayloadAction<Omit<ToastItem, "id"> & { id?: string }>) => {
      state.activeToasts.push({ id: action.payload.id ?? `${Date.now()}-${state.activeToasts.length}`, ...action.payload });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.activeToasts = state.activeToasts.filter((item) => item.id !== action.payload);
    },
    showConfirm: (
      state,
      action: PayloadAction<{ title: string; description: string; variant?: "danger" | "warning" | "default" }>,
    ) => {
      state.confirmDialog = {
        open: true,
        title: action.payload.title,
        description: action.payload.description,
        variant: action.payload.variant ?? "default",
      };
    },
    hideConfirm: (state) => {
      state.confirmDialog.open = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setGlobalLoading,
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  upsertActiveScreening,
  removeActiveScreening,
  addToast,
  removeToast,
  showConfirm,
  hideConfirm,
} = uiSlice.actions;
export default uiSlice.reducer;
