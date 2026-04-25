import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Applicant } from "../../types";

interface ApplicantsState {
  applicants: Applicant[];
  total: number;
  loading: boolean;
  uploading: boolean;
  uploadProgress: Record<string, number>;
  parseResults: Record<string, unknown> | null;
  error: string | null;
}

const initialState: ApplicantsState = {
  applicants: [],
  total: 0,
  loading: false,
  uploading: false,
  uploadProgress: {},
  parseResults: null,
  error: null,
};

const applicantsSlice = createSlice({
  name: "applicants",
  initialState,
  reducers: {
    setApplicants: (state, action: PayloadAction<{ applicants: Applicant[]; total: number }>) => {
      state.applicants = action.payload.applicants;
      state.total = action.payload.total;
    },
    setApplicantsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.uploading = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<{ fileName: string; progress: number }>) => {
      state.uploadProgress[action.payload.fileName] = action.payload.progress;
    },
    setParseResults: (state, action: PayloadAction<Record<string, unknown> | null>) => {
      state.parseResults = action.payload;
    },
    setApplicantsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setApplicants, setApplicantsLoading, setUploading, setUploadProgress, setParseResults, setApplicantsError } = applicantsSlice.actions;
export default applicantsSlice.reducer;
