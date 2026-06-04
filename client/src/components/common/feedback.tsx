import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-copper", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full animate-sweep bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function Progress({ value, tone = "copper", className }: { value: number; tone?: "copper" | "signal" | "ok" | "bad" | "warn"; className?: string }) {
  const colors: Record<string, string> = {
    copper: "bg-copper",
    signal: "bg-signal",
    ok: "bg-ok",
    bad: "bg-bad",
    warn: "bg-warn",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-snap", colors[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-faint">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 max-w-xs text-xs text-ink-dim">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Gagal memuat data"
      description={message ?? "Terjadi kesalahan."}
      action={
        onRetry && (
          <button onClick={onRetry} className="text-xs font-semibold text-copper hover:text-copper-bright">
            Coba lagi
          </button>
        )
      }
    />
  );
}
