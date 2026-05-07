import { baseApi } from "./baseApi";

export type OrgMember = {
  id: string;
  name: string;
  email: string;
  orgRole: "owner" | "admin" | "recruiter" | "viewer";
  createdAt?: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "growth" | "enterprise";
  seats: number;
  billingStatus: "trialing" | "active" | "past_due" | "cancelled";
  createdAt?: string;
};

export type OrgWithMembers = Organization & { members: OrgMember[] };

export const orgApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getOrg: builder.query<OrgWithMembers, void>({
      query: () => ({ url: "/org", method: "get" }),
      providesTags: ["Org"],
    }),
    updateOrg: builder.mutation<Organization, { name?: string; slug?: string }>({
      query: (body) => ({ url: "/org", method: "put", data: body }),
      invalidatesTags: ["Org"],
    }),
    listMembers: builder.query<OrgMember[], void>({
      query: () => ({ url: "/org/members", method: "get" }),
      providesTags: ["Org"],
    }),
    inviteMember: builder.mutation<{ sent: boolean; message: string }, { email: string; name: string; orgRole?: string }>({
      query: (body) => ({ url: "/org/invite", method: "post", data: body }),
      invalidatesTags: ["Org"],
    }),
    updateMember: builder.mutation<OrgMember, { memberId: string; orgRole: string }>({
      query: ({ memberId, ...body }) => ({ url: `/org/members/${memberId}`, method: "patch", data: body }),
      invalidatesTags: ["Org"],
    }),
    removeMember: builder.mutation<{ success: boolean }, string>({
      query: (memberId) => ({ url: `/org/members/${memberId}`, method: "delete" }),
      invalidatesTags: ["Org"],
    }),
  }),
});

export const {
  useGetOrgQuery,
  useUpdateOrgMutation,
  useListMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberMutation,
  useRemoveMemberMutation,
} = orgApi;
