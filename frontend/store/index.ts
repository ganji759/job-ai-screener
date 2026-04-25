import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import jobsReducer from "./slices/jobsSlice";
import applicantsReducer from "./slices/applicantsSlice";
import screeningsReducer from "./slices/screeningsSlice";
import analyticsReducer from "./slices/analyticsSlice";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    jobs: jobsReducer,
    applicants: applicantsReducer,
    screenings: screeningsReducer,
    analytics: analyticsReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
