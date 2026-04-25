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
    /**
     * Backend exposes only `DELETE /notifications/:id`. Fetch the current list and
     * delete each notification in parallel; report how many succeeded.
     */
    deleteAllNotifications: builder.mutation<{ success: boolean; deleted: number }, void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const listResult = await baseQuery({
          url: "/notifications",
          method: "get",
          params: { page: 1, limit: 500 },
        });
        if (listResult.error) return { error: listResult.error };
        const body = listResult.data as { notifications?: { _id: string }[] };
        const ids = (body.notifications ?? []).map((n) => n._id).filter(Boolean);
        if (ids.length === 0) return { data: { success: true, deleted: 0 } };

        const outcomes = await Promise.all(
          ids.map((id) => baseQuery({ url: `/notifications/${id}`, method: "delete" })),
        );
        const deleted = outcomes.filter((o) => !o.error).length;
        return { data: { success: deleted === ids.length, deleted } };
      },
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
