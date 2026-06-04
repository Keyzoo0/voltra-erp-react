import { Link } from "react-router-dom";
import { Home, Unplug } from "lucide-react";
import { Button } from "@/components/common/Button";

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-faint">
        <Unplug className="h-7 w-7" />
      </div>
      <div>
        <p className="data text-5xl font-bold text-copper">404</p>
        <h1 className="mt-2 font-display text-xl font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-dim">Rute yang kamu tuju tidak ada di sistem.</p>
      </div>
      <Link to="/">
        <Button variant="primary" icon={<Home className="h-4 w-4" />}>
          Kembali ke Dashboard
        </Button>
      </Link>
    </div>
  );
}
