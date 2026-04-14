import { baseApi } from "./baseApi";
import type { Notification } from "../../types";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<{ notifications: Notification[]; total: number; page: number; totalPages: number }, { page?: number; limit?: number } | void>({
      query: (params) => ({
        url: "/notifications",
        method: "get",
        params: params ?? { page: 1, limit: 20 },
      }),
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "patch" }),
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/notifications/read-all", method: "patch" }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "delete" }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi;
