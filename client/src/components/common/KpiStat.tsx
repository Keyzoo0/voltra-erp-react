import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCountUp } from "@/hooks/useCountUp";

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  format?: (n: number) => string;
  icon?: ReactNode;
  accent?: "copper" | "signal" | "ok" | "bad" | "warn";
  delta?: { value: string; positive?: boolean; muted?: boolean };
  hint?: string;
  className?: string;
}

const ACCENTS = {
  copper: "text-copper",
  signal: "text-signal",
  ok: "text-ok",
  bad: "text-bad",
  warn: "text-warn",
};

export function KpiStat({ label, value, unit, format, icon, accent = "copper", delta, hint, className }: Props) {
  const isNum = typeof value === "number";
  const animated = useCountUp(isNum ? value : 0);
  const shown = isNum ? (format ? format(animated) : Math.round(animated).toLocaleString("id-ID")) : value;

  return (
    <div className={cn("panel relative overflow-hidden p-4", className)}>
      <div className="flex items-start justify-between">
        <span className="label">{label}</span>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2", ACCENTS[accent])}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="data text-3xl font-semibold leading-none text-ink">{shown}</span>
        {unit && <span className="text-sm text-ink-faint">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-2xs font-semibold",
              delta.muted ? "text-ink-faint" : delta.positive ? "text-ok" : "text-bad",
            )}
          >
            {!delta.muted && (delta.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
      </div>
    </div>
  );
}
