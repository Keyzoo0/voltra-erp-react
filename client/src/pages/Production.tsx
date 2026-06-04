import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Radio, ScanLine } from "lucide-react";
import type { User } from "@/types";
import { STATIONS, STATION_META } from "@/lib/domain";
import { pct } from "@/lib/format";
import { api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useProductionBoard } from "@/hooks/useProductionBoard";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/common/Panel";
import { Button } from "@/components/common/Button";
import { Skeleton } from "@/components/common/feedback";
import { CHART, ChartTooltip, axisProps } from "@/components/common/chart";
import { StationColumn } from "@/components/production/StationColumn";
import { ScanModal } from "@/components/production/ScanModal";

export function Production() {
  const can = useCan();
  const { cards, connected } = useProductionBoard();
  const { data: users } = useAsync(() => api.users.list(), []);
  const { data: stats, refetch } = useAsync(() => api.production.stats(), []);
  const [scanOpen, setScanOpen] = useState(false);

  const userMap = new Map((users ?? []).map((u: User) => [u.id, u]));
  const canScan = can("production.scan");

  // keep station/throughput stats fresh as the board moves
  useEffect(() => {
    const t = setInterval(refetch, 6000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-2xs font-bold uppercase tracking-wider",
              connected ? "border-ok/30 bg-ok/10 text-ok" : "border-line bg-surface-2 text-ink-faint",
            )}
          >
            <Radio className={cn("h-3.5 w-3.5", connected && "animate-pulse-led")} />
            {connected ? "Live" : "Offline"}
          </span>
          <p className="text-sm text-ink-dim">
            <span className="data font-semibold text-ink">{cards.length}</span> job di lantai produksi · update real-time via WebSocket
          </p>
        </div>
        {canScan && (
          <Button variant="primary" icon={<ScanLine className="h-4 w-4" />} onClick={() => setScanOpen(true)}>
            Scan Order
          </Button>
        )}
      </div>

      {/* kanban board */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {STATIONS.map((station) => (
          <StationColumn
            key={station}
            station={station}
            cards={cards.filter((c) => c.station === station)}
            userMap={userMap}
            canAdvance={canScan}
            onAdvance={(id) => api.production.advance(id)}
          />
        ))}
      </div>

      {/* analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Throughput Hari Ini" subtitle="unit selesai per jam · shift 08:00–16:00" icon={<Activity className="h-4 w-4" />} accent>
          <div className="h-56 w-full">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.hourlyThroughput} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="thru" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.signal} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={CHART.signal} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="hour" {...axisProps} />
                  <YAxis {...axisProps} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.grid }} />
                  <Area dataKey="units" name="Unit" stroke={CHART.signal} strokeWidth={2} fill="url(#thru)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full" />
            )}
          </div>
        </Panel>

        <Panel title="Statistik per Station" subtitle="hari ini">
          <div className="space-y-2.5">
            {stats?.perStation.map((s) => (
              <div key={s.station} className="rounded-lg border border-line bg-canvas-2 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{STATION_META[s.station].label}</span>
                  <span className="data text-xs font-semibold text-ok">{pct(s.yieldRate, 0)} yield</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-2xs text-ink-faint">
                  <span className="data">{s.completedToday} selesai</span>
                  <span className="data">{s.inProgress} aktif</span>
                  <span className="data">{s.queued} antri</span>
                  <span className="data ml-auto">~{s.avgCycleMin}m/unit</span>
                </div>
              </div>
            ))}
            {!stats && <Skeleton className="h-64" />}
          </div>
        </Panel>
      </div>

      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  );
}
