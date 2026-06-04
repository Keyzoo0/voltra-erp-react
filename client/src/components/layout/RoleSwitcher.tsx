import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Eye } from "lucide-react";
import type { Role } from "@/types";
import { ROLES, ROLE_META } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth";
import { toast } from "@/stores/ui";

/** Demo affordance: instantly view the app as any of the 4 roles
 *  to show off role-based access control. */
export function RoleSwitcher() {
  const user = useAuth((s) => s.user);
  const switchRole = useAuth((s) => s.switchRole);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const pick = async (role: Role) => {
    setOpen(false);
    if (role === user.role) return;
    await switchRole(role);
    toast.info(`Sekarang sebagai ${ROLE_META[role].label}`, "Akses menu & aksi menyesuaikan role.");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-press flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-2 pl-2.5 pr-2 text-xs font-medium text-ink-dim hover:border-copper/40 hover:text-ink"
      >
        <Eye className="h-3.5 w-3.5 text-copper" />
        <span className="hidden sm:inline">Lihat sebagai</span>
        <span className="font-semibold text-ink">{ROLE_META[user.role].label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-fade-up rounded-xl border border-line bg-surface p-1.5 shadow-panel">
          <p className="label px-2.5 py-1.5">Demo · Role-based access</p>
          {ROLES.map((role) => {
            const active = role === user.role;
            return (
              <button
                key={role}
                onClick={() => pick(role)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  active ? "bg-surface-2" : "hover:bg-surface-2/60",
                )}
              >
                <span className={cn("mt-0.5 flex h-4 w-4 items-center justify-center", active ? "text-copper" : "text-transparent")}>
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{ROLE_META[role].label}</span>
                  <span className="block text-2xs leading-snug text-ink-dim">{ROLE_META[role].blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
