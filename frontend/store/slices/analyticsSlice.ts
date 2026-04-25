import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AnalyticsState {
  analytics: Record<string, unknown> | null;
  dateRange: "7d" | "30d" | "90d" | "custom";
  loading: boolean;
}

const initialState: AnalyticsState = {
  analytics: null,
  dateRange: "30d",
  loading: false,
};

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    setAnalytics: (state, action: PayloadAction<Record<string, unknown> | null>) => {
      state.analytics = action.payload;
    },
    setDateRange: (state, action: PayloadAction<AnalyticsState["dateRange"]>) => {
      state.dateRange = action.payload;
    },
    setAnalyticsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setAnalytics, setDateRange, setAnalyticsLoading } = analyticsSlice.actions;
export default analyticsSlice.reducer;
