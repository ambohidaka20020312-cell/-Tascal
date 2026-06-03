import { create } from "zustand";

interface User {
  id: number;
  email: string;
  name: string;
  plan: "free" | "pro" | "team" | "personal_pro" | "business" | "enterprise";
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null });
  },
  isAuthenticated: () => !!get().user,
}));
