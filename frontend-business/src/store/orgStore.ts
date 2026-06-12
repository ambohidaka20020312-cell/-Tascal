import { create } from "zustand";

export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: "business" | "enterprise";
  owner_id: number;
  max_members: number;
  created_at: string;
}

export interface Department {
  id: number;
  org_id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface OrgMember {
  id: number;
  org_id: number;
  user_id: number;
  department_id: number | null;
  role: "owner" | "admin" | "member";
  joined_at: string;
  email?: string;
  name?: string;
}

interface OrgState {
  organization: Organization | null;
  departments: Department[];
  members: OrgMember[];
  setOrg: (org: Organization | null) => void;
  setDepartments: (departments: Department[]) => void;
  setMembers: (members: OrgMember[]) => void;
  reset: () => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  organization: null,
  departments: [],
  members: [],
  setOrg: (org) => set({ organization: org }),
  setDepartments: (departments) => set({ departments }),
  setMembers: (members) => set({ members }),
  reset: () => set({ organization: null, departments: [], members: [] }),
}));
