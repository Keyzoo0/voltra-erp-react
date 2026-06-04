import { create } from "zustand";

export type ToastKind = "success" | "error" | "info" | "warn";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface UiState {
  toasts: Toast[];
  sidebarOpen: boolean;
  pushToast: (t: Omit<Toast, "id">) => string;
  dismissToast: (id: string) => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
}

export const useUi = create<UiState>((set, get) => ({
  toasts: [],
  sidebarOpen: false,

  pushToast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    const ttl = t.kind === "error" ? 6500 : 4200;
    window.setTimeout(() => get().dismissToast(id), ttl);
    return id;
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
}));

// convenience helpers
export const toast = {
  success: (title: string, message?: string) => useUi.getState().pushToast({ kind: "success", title, message }),
  error: (title: string, message?: string) => useUi.getState().pushToast({ kind: "error", title, message }),
  info: (title: string, message?: string) => useUi.getState().pushToast({ kind: "info", title, message }),
  warn: (title: string, message?: string) => useUi.getState().pushToast({ kind: "warn", title, message }),
};
