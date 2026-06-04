import type { TooltipProps } from "recharts";

// hex mirrors of the CSS theme tokens (recharts needs concrete colours)
export const CHART = {
  copper: "#E8A33D",
  signal: "#3FD0CE",
  ok: "#4FBE7E",
  bad: "#F0605D",
  warn: "#F59E42",
  info: "#5B9BD5",
  qc: "#9B8CFA",
  grid: "#26302D",
  axis: "#5E6B65",
};

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART.grid },
} as const;

export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line-strong bg-surface/95 px-3 py-2 shadow-panel backdrop-blur">
      {label != null && <p className="label mb-1 text-ink-dim">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-ink-dim">{p.name}</span>
            <span className="data ml-auto font-semibold text-ink">
              {typeof p.value === "number" ? p.value.toLocaleString("id-ID") : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
