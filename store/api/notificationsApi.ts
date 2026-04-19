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
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchTargets = [
          undefined,
          { page: 1, limit: 20 },
          { page: 1, limit: 30 },
          { page: 1, limit: 50 },
          { page: 1, limit: 100 },
        ] as const;
        const patches = patchTargets.map((arg) =>
          dispatch(
            notificationsApi.util.updateQueryData("getNotifications", arg, (draft) => {
              const target = draft.notifications.find((item) => item._id === id);
              if (target && !target.readAt) {
                target.readAt = new Date().toISOString();
              }
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
    markAllNotificationsRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/notifications/read-all", method: "patch" }),
      invalidatesTags: ["Notifications"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchTargets = [
          undefined,
          { page: 1, limit: 20 },
          { page: 1, limit: 30 },
          { page: 1, limit: 50 },
          { page: 1, limit: 100 },
        ] as const;
        const patches = patchTargets.map((arg) =>
          dispatch(
            notificationsApi.util.updateQueryData("getNotifications", arg, (draft) => {
              draft.notifications.forEach((item) => {
                if (!item.readAt) item.readAt = new Date().toISOString();
              });
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
    deleteAllNotifications: builder.mutation<{ success: boolean; deleted: number }, void>({
      query: () => ({ url: "/notifications/all", method: "delete" }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: "delete" }),
      invalidatesTags: ["Notifications"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchTargets = [
          undefined,
          { page: 1, limit: 20 },
          { page: 1, limit: 30 },
          { page: 1, limit: 50 },
          { page: 1, limit: 100 },
        ] as const;
        const patches = patchTargets.map((arg) =>
          dispatch(
            notificationsApi.util.updateQueryData("getNotifications", arg, (draft) => {
              draft.notifications = draft.notifications.filter((item) => item._id !== id);
              draft.total = Math.max(0, draft.total - 1);
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
} = notificationsApi;
