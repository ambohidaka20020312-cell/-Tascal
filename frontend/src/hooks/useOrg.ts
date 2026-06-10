import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "../utils/api";

export interface OrgMember {
  id: number;
  org_member_id: number;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

export interface Org {
  id: number;
  name: string;
  owner_id: number;
  role: "owner" | "admin" | "member";
}

export function useOrg() {
  return useQuery<Org | null>({
    queryKey: ["org"],
    queryFn: async () => {
      try {
        const res = await orgApi.get();
        return (res.data as { data: Org | null }).data ?? null;
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useOrgMembers(orgId: number) {
  return useQuery<OrgMember[]>({
    queryKey: ["org", orgId, "members"],
    queryFn: async () => {
      const res = await orgApi.getMembers(orgId);
      return (res.data as { data: OrgMember[] }).data ?? [];
    },
    enabled: orgId > 0,
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => orgApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });
}

export function useInviteMember(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => orgApi.invite(orgId, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "members"] }),
  });
}

export function useRemoveMember(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => orgApi.removeMember(orgId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "members"] });
      qc.invalidateQueries({ queryKey: ["org"] });
    },
  });
}

export function useUpdateMemberRole(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: "admin" | "member" }) =>
      orgApi.updateMemberRole(orgId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "members"] }),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => orgApi.acceptInvite(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org"] }),
  });
}
