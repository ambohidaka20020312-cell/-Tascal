import { create } from "zustand";
import { SignInWithApple, SignInWithAppleOptions } from "@capacitor-community/apple-sign-in";
import api, { authApi } from "../utils/api";
import analytics from "../utils/analytics";

interface User {
  id: number;
  email: string;
  name: string;
  plan: "free" | "pro" | "team" | "personal_pro" | "business" | "enterprise";
  onboarding_completed?: boolean;
  trial_active?: boolean;
  trial_days_left?: number;
  effective_plan?: string;
  is_admin?: boolean;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  appleSignIn: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: (user) => {
    set({ user });
    if (user) analytics.identify(user.id.toString(), { plan: user.plan });
  },
  updateUser: (patch) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...patch } });
  },
  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    analytics.reset();
    set({ user: null });
  },
  isAuthenticated: () => !!get().user,
  appleSignIn: async () => {
    const options: SignInWithAppleOptions = {
      clientId: "app.tascal.personal",
      redirectURI: "https://tascal-api.onrender.com/auth/apple/callback",
      scopes: "email name",
      state: Math.random().toString(36).substring(2),
    };
    const result = await SignInWithApple.authorize(options);
    const { data } = await api.post("/auth/apple", {
      identity_token: result.response.identityToken,
      name: result.response.givenName || "Tascalユーザー",
    });
    const { access_token, refresh_token, user } = data.data ?? data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    const store = get();
    store.setUser(user);
  },
}));
