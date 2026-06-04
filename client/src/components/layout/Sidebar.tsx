import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  LogOut,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";
import { ROLE_META } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth";
import { useUi } from "@/stores/ui";
import { Logo } from "@/components/common/Logo";
import { Avatar } from "@/components/common/Avatar";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor", "operator", "viewer"], end: true },
  { to: "/orders", label: "Orders", icon: ClipboardList, roles: ["admin", "supervisor", "operator"] },
  { to: "/inventory", label: "Inventory", icon: Boxes, roles: ["admin", "supervisor", "operator", "viewer"] },
  { to: "/production", label: "Production", icon: Cpu, roles: ["admin", "supervisor", "operator"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "supervisor", "viewer"] },
];
const ADMIN_NAV: NavItem[] = [{ to: "/users", label: "Users & Roles", icon: Users, roles: ["admin"] }];

function NavGroup({ items, role, onNavigate }: { items: NavItem[]; role: Role; onNavigate: () => void }) {
  return (
    <>
      {items
        .filter((i) => i.roles.includes(role))
        .map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-surface-2 text-ink" : "text-ink-dim hover:bg-surface-2/60 hover:text-ink",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-copper transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon className={cn("h-[18px] w-[18px] transition-colors", isActive ? "text-copper" : "text-ink-faint group-hover:text-ink-dim")} />
                {label}
              </>
            )}
          </NavLink>
        ))}
    </>
  );
}

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const setSidebar = useUi((s) => s.setSidebar);
  if (!user) return null;
  const close = () => setSidebar(false);

  return (
    <>
      {/* mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-canvas/70 backdrop-blur-sm transition-opacity lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={close}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-line bg-canvas-2 transition-transform duration-300 ease-snap lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="bg-grid flex h-16 items-center border-b border-line px-5">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="label px-3 pb-1.5">Workspace</p>
          <NavGroup items={NAV} role={user.role} onNavigate={close} />

          {user.role === "admin" && (
            <>
              <p className="label px-3 pb-1.5 pt-5">Administrasi</p>
              <NavGroup items={ADMIN_NAV} role={user.role} onNavigate={close} />
            </>
          )}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-2xs text-ink-dim">{ROLE_META[user.role].label}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-surface-2 hover:text-bad"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
