import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Job } from "../../types";

interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  filters: { status?: string; search?: string; sort?: string };
}

const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  total: 0,
  page: 1,
  loading: false,
  error: null,
  filters: {},
};

const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<{ jobs: Job[]; total: number; page: number }>) => {
      state.jobs = action.payload.jobs;
      state.total = action.payload.total;
      state.page = action.payload.page;
    },
    setCurrentJob: (state, action: PayloadAction<Job | null>) => {
      state.currentJob = action.payload;
    },
    setJobsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setJobsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<JobsState["filters"]>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const { setJobs, setCurrentJob, setJobsLoading, setJobsError, setFilters, clearFilters } = jobsSlice.actions;
export default jobsSlice.reducer;
