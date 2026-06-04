import { create } from "zustand";
import type { Role, User } from "@/types";
import { ApiError, api } from "@/mock/api";

const TOKEN_KEY = "voltra.token";

// demo credential mapping for the one-click role switcher
const DEMO_USER_BY_ROLE: Record<Role, string> = {
  admin: "rangga",
  supervisor: "sari",
  operator: "budi",
  viewer: "maya",
};

interface AuthState {
  user: User | null;
  token: string | null;
  status: "idle" | "loading" | "authed" | "error";
  error?: string;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  status: "idle",

  bootstrap: async () => {
    const token = get().token;
    if (!token) {
      set({ status: "idle" });
      return;
    }
    set({ status: "loading" });
    try {
      const user = await api.auth.me(token);
      set({ user, status: "authed" });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, status: "idle" });
    }
  },

  login: async (username, password) => {
    set({ status: "loading", error: undefined });
    try {
      const { token, user } = await api.auth.login(username, password);
      localStorage.setItem(TOKEN_KEY, token);
      set({ token, user, status: "authed" });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Gagal login.";
      set({ status: "error", error: message });
      throw e;
    }
  },

  switchRole: async (role) => {
    await get().login(DEMO_USER_BY_ROLE[role], "demo");
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, status: "idle", error: undefined });
  },
}));
