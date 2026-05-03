import { baseApi } from "./baseApi";
import type { User } from "../../types";
import { loadUserOverrides, saveUserOverrides } from "../../lib/settingsStorage";

type RawMeResponse = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "recruiter" | "admin";
  createdAt?: string;
  avatarUrl?: string | null;
};

/**
 * Backend `/auth/me` returns `{ _id, name, email, role }`. We map `_id` → `id` for the
 * UI type and merge any locally-stored overrides (display name, avatar) so the profile
 * page stays responsive to user-initiated changes even though the backend does not
 * persist them yet.
 */
const normalizeMe = (raw: RawMeResponse): User => {
  const overrides = loadUserOverrides();
  return {
    id: String(raw.id ?? raw._id ?? ""),
    name: overrides.name ?? raw.name,
    email: raw.email,
    role: raw.role,
    avatarUrl: overrides.avatarUrl ?? raw.avatarUrl ?? null,
    createdAt: raw.createdAt,
  };
};

export const authApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    login: builder.mutation<
      { requiresOtp?: boolean; message?: string; token?: string; user?: User },
      { email: string; password: string }
    >({
      query: (body) => ({ url: "/auth/login", method: "post", data: body }),
    }),
    verifyOtp: builder.mutation<
      { token: string; user: User },
      { email: string; code: string; purpose: "login_2fa" | "verify_email" | "password_reset" }
    >({
      query: (body) => ({ url: "/auth/otp/verify", method: "post", data: body }),
    }),
    sendOtp: builder.mutation<
      { sent: boolean },
      { email: string; purpose: "login_2fa" | "verify_email" | "password_reset" }
    >({
      query: (body) => ({ url: "/auth/otp/send", method: "post", data: body }),
    }),
    register: builder.mutation<
      { token: string; user: User; otpSent?: boolean; warning?: string },
      { name: string; email: string; password: string }
    >({
      query: (body) => ({ url: "/auth/register", method: "post", data: body }),
    }),
    me: builder.query<User, void>({
      query: () => ({ url: "/auth/me", method: "get" }),
      transformResponse: (raw: RawMeResponse) => normalizeMe(raw),
    }),
    /**
     * The backend has no `PATCH /auth/me` yet. We persist the change locally and
     * update the RTK cache so the UI reflects it immediately and across reloads.
     */
    updateMe: builder.mutation<User, { name?: string; avatarUrl?: string | null }>({
      async queryFn(body, { dispatch, getState }) {
        const overrides = loadUserOverrides();
        const nextOverrides = {
          name: body.name ?? overrides.name,
          avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : overrides.avatarUrl,
        };
        saveUserOverrides(nextOverrides);

        const current = authApi.endpoints.me.select()(getState() as never).data;
        const merged: User = {
          id: current?.id ?? "",
          email: current?.email ?? "",
          role: current?.role ?? "recruiter",
          createdAt: current?.createdAt,
          name: nextOverrides.name ?? current?.name ?? "",
          avatarUrl: nextOverrides.avatarUrl ?? null,
        };

        dispatch(authApi.util.updateQueryData("me", undefined, () => merged));
        return { data: merged };
      },
    }),
    /**
     * Password change is not yet exposed by the backend. Surface a clear error so the
     * UI does not pretend to succeed.
     */
    changePassword: builder.mutation<
      { success: boolean },
      { currentPassword: string; newPassword: string }
    >({
      async queryFn() {
        return {
          error: {
            status: 501,
            data: {
              error: "Password change is not available yet. Please contact an administrator.",
            },
          },
        };
      },
    }),
    resetPassword: builder.mutation<
      { token: string; user: User },
      { email: string; code: string; newPassword: string }
    >({
      query: (body) => ({ url: "/auth/password-reset", method: "post", data: body }),
    }),
    /**
     * Account deletion is not yet exposed by the backend. Surface a clear error.
     */
    deleteAccount: builder.mutation<{ success: boolean }, { email: string }>({
      async queryFn() {
        return {
          error: {
            status: 501,
            data: {
              error: "Account deletion is not available yet. Please contact an administrator.",
            },
          },
        };
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useVerifyOtpMutation,
  useSendOtpMutation,
  useRegisterMutation,
  useResetPasswordMutation,
  useMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
} = authApi;
