import { Check, Minus, ShieldCheck } from "lucide-react";
import type { Permission, Role } from "@/types";
import { ROLES, ROLE_META, STATION_META } from "@/lib/domain";
import { permissionsFor } from "@/lib/rbac";
import { cn } from "@/lib/cn";
import { api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { Panel } from "@/components/common/Panel";
import { Avatar } from "@/components/common/Avatar";
import { Badge } from "@/components/common/StatusBadge";
import { Skeleton } from "@/components/common/feedback";
import type { Tone } from "@/lib/domain";

const ROLE_TONE: Record<Role, Tone> = { admin: "copper", supervisor: "live", operator: "ok", viewer: "info" };

const PERMISSION_ROWS: { permission: Permission; label: string; note?: string }[] = [
  { permission: "order.create", label: "Buat & edit order" },
  { permission: "order.status", label: "Update status order", note: "operator: hanya di workstation sendiri" },
  { permission: "inventory.view", label: "Lihat inventory" },
  { permission: "inventory.adjust", label: "Adjust stok" },
  { permission: "production.scan", label: "Production scan" },
  { permission: "reports.view", label: "Lihat laporan" },
  { permission: "reports.export", label: "Export laporan" },
  { permission: "users.manage", label: "Kelola user" },
];

export function Users() {
  const { data: users, loading } = useAsync(() => api.users.list(), []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">Users & Roles</h2>
        <p className="mt-1 text-sm text-ink-dim">8 orang di workshop, 4 role dengan akses berbeda.</p>
      </header>

      <Panel title="Anggota Tim" subtitle={`${users?.length ?? 0} user aktif`} icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[76px]" />)
            : users?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line bg-canvas-2 p-3">
                  <Avatar user={u} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                    <p className="data truncate text-2xs text-ink-dim">@{u.username}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge tone={ROLE_TONE[u.role]}>{ROLE_META[u.role].label}</Badge>
                      {u.station && (
                        <span className="text-2xs text-ink-faint">· {STATION_META[u.station].label}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </Panel>

      <Panel title="Matriks Hak Akses" subtitle="Role-based access control" accent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="label py-2.5 pr-4 text-left">Aksi</th>
                {ROLES.map((r) => (
                  <th key={r} className="label px-3 py-2.5 text-center">
                    {ROLE_META[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.permission} className="border-b border-line/60">
                  <td className="py-2.5 pr-4">
                    <span className="text-ink">{row.label}</span>
                    {row.note && <span className="block text-2xs text-ink-faint">{row.note}</span>}
                  </td>
                  {ROLES.map((r) => {
                    const allowed = permissionsFor(r).includes(row.permission);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-md",
                            allowed ? "bg-ok/10 text-ok" : "text-ink-faint",
                          )}
                        >
                          {allowed ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
