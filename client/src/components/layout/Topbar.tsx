import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { useUi } from "@/stores/ui";
import { StatusLED } from "@/components/common/StatusLED";
import { RoleSwitcher } from "./RoleSwitcher";

function pageTitle(path: string): { title: string; crumb?: string } {
  if (path === "/") return { title: "Dashboard" };
  if (path.startsWith("/orders/")) return { title: "Detail Order", crumb: "Orders" };
  if (path.startsWith("/orders")) return { title: "Orders" };
  if (path.startsWith("/inventory")) return { title: "Inventory & BOM" };
  if (path.startsWith("/production")) return { title: "Production Floor" };
  if (path.startsWith("/reports")) return { title: "Laporan & Analytics" };
  if (path.startsWith("/users")) return { title: "Users & Roles" };
  return { title: "Voltra ERP" };
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="data hidden text-xs text-ink-dim md:inline">
      {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

export function Topbar() {
  const toggle = useUi((s) => s.toggleSidebar);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { title, crumb } = pageTitle(pathname);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/inventory?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={toggle}
        className="rounded-lg p-2 text-ink-dim hover:bg-surface-2 hover:text-ink lg:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        {crumb && <span className="label hidden text-ink-faint sm:block">{crumb}</span>}
        <h1 className="truncate font-display text-lg font-bold tracking-tight text-ink">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <form onSubmit={submit} className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari komponen / part number…"
            className="h-9 w-52 rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-copper/50 focus:outline-none lg:w-64"
          />
        </form>

        <div className="hidden items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 sm:flex">
          <StatusLED tone="ok" pulse />
          <span className="label text-ink-dim">On-Prem</span>
          <Clock />
        </div>

        <RoleSwitcher />
      </div>
    </header>
  );
}
