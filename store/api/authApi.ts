import { baseApi } from "./baseApi";
import type { User } from "../../types";

export const authApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    login: builder.mutation<{ requiresOtp?: boolean; message?: string; token?: string; user?: User }, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "post", data: body }),
    }),
    verifyOtp: builder.mutation<{ token: string; user: User }, { email: string; code: string; purpose: "login_2fa" | "verify_email" | "password_reset" }>({
      query: (body) => ({ url: "/auth/otp/verify", method: "post", data: body }),
    }),
    sendOtp: builder.mutation<{ sent: boolean }, { email: string; purpose: "login_2fa" | "verify_email" | "password_reset" }>({
      query: (body) => ({ url: "/auth/otp/send", method: "post", data: body }),
    }),
    register: builder.mutation<{ token: string; user: User; otpSent?: boolean; warning?: string }, { name: string; email: string; password: string }>({
      query: (body) => ({ url: "/auth/register", method: "post", data: body }),
    }),
    me: builder.query<User, void>({
      query: () => ({ url: "/auth/me", method: "get" }),
    }),
  }),
});

export const { useLoginMutation, useVerifyOtpMutation, useSendOtpMutation, useRegisterMutation, useMeQuery } = authApi;
