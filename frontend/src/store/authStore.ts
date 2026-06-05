import { create } from "zustand";
import { authApi } from "../utils/api";

interface User {
  id: number;
  email: string;
  name: string;
  plan: "free" | "pro" | "team" | "personal_pro" | "business" | "enterprise";
  onboarding_completed?: boolean;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUser: (patch) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...patch } });
  },
  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null });
  },
  isAuthenticated: () => !!get().user,
}));
