import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import type { Role } from "@/types";
import { useAuth } from "@/stores/auth";
import { LogoMark } from "@/components/common/Logo";
import { Panel } from "@/components/common/Panel";
import { Spinner } from "@/components/common/feedback";

export function Splash() {
  return (
    <div className="bg-app flex min-h-screen flex-col items-center justify-center gap-4">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <div className="flex items-center gap-2 text-sm text-ink-dim">
        <Spinner /> Menyiapkan workspace…
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const status = useAuth((s) => s.status);
  const location = useLocation();

  if (user) return <>{children}</>;
  if (token && status === "loading") return <Splash />;
  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export function RequireAccess({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  if (user && roles.includes(user.role)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md py-16">
      <Panel accent>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-bad/30 bg-bad/10 text-bad">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Akses ditolak</h2>
            <p className="mt-1 text-sm text-ink-dim">
              Role <span className="font-semibold text-ink">{user?.role}</span> tidak punya akses ke halaman ini.
              Coba ganti role lewat tombol "Lihat sebagai".
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
