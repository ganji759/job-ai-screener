import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Screening } from "../../types";

interface ScreeningsState {
  screenings: Screening[];
  currentScreening: Screening | null;
  pollingActive: boolean;
  pollingInterval: number;
  results: Record<string, unknown> | null;
  loading: boolean;
}

const initialState: ScreeningsState = {
  screenings: [],
  currentScreening: null,
  pollingActive: false,
  pollingInterval: 3000,
  results: null,
  loading: false,
};

const screeningsSlice = createSlice({
  name: "screenings",
  initialState,
  reducers: {
    setScreenings: (state, action: PayloadAction<Screening[]>) => {
      state.screenings = action.payload;
    },
    setCurrentScreening: (state, action: PayloadAction<Screening | null>) => {
      state.currentScreening = action.payload;
    },
    setResults: (state, action: PayloadAction<Record<string, unknown> | null>) => {
      state.results = action.payload;
    },
    setScreeningsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    startPolling: (state) => {
      state.pollingActive = true;
    },
    stopPolling: (state) => {
      state.pollingActive = false;
    },
  },
});

export const { setScreenings, setCurrentScreening, setResults, setScreeningsLoading, startPolling, stopPolling } = screeningsSlice.actions;
export default screeningsSlice.reducer;
