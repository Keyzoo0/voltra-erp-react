import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Plus,
  Timer,
} from "lucide-react";
import type { OrderStatus } from "@/types";
import { STATION_META, STATUS_META } from "@/lib/domain";
import { dueLabel, fmtDate, num, pct } from "@/lib/format";
import { api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/stores/auth";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/common/Panel";
import { KpiStat } from "@/components/common/KpiStat";
import { Button } from "@/components/common/Button";
import { Progress, Skeleton } from "@/components/common/feedback";
import { OrderStatusBadge } from "@/components/common/StatusBadge";
import { StatusLED } from "@/components/common/StatusLED";
import { CHART, ChartTooltip, axisProps } from "@/components/common/chart";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export function Dashboard() {
  const user = useAuth((s) => s.user);
  const can = useCan();
  const navigate = useNavigate();

  const { data: stats, loading } = useAsync(() => api.reports.dashboard(), []);
  const { data: dueSoon } = useAsync(
    () => api.orders.list({ activeOnly: true, sortBy: "dueDate", sortDir: "asc", pageSize: 6 }),
    [],
  );
  const { data: alerts } = useAsync(() => api.inventory.alerts(), []);

  const maxStatus = Math.max(1, ...(stats?.statusBreakdown.map((s) => s.count) ?? [1]));

  return (
    <div className="space-y-6">
      {/* greeting + CTA */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">
            {greeting()}, {user?.name.split(" ")[0]} 👋
          </h2>
          <p className="mt-1 text-sm text-ink-dim">
            Ringkasan operasi workshop ·{" "}
            <span className="data text-ink-faint">{fmtDate(new Date(), "EEEE, d MMMM yyyy")}</span>
          </p>
        </div>
        {can("order.create") && (
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate("/orders?new=1")}>
            Buat Order
          </Button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[116px]" />)
        ) : (
          <>
            <KpiStat
              label="Order Aktif"
              value={stats.activeOrders}
              icon={<ClipboardList className="h-4 w-4" />}
              accent="copper"
              delta={{ value: `${stats.ordersDueThisWeek} due minggu ini`, muted: true }}
            />
            <KpiStat
              label="Unit Selesai (hari ini)"
              value={stats.unitsCompletedToday}
              unit="unit"
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="ok"
              delta={{ value: `yield ${pct(stats.yieldRate, 1)}`, positive: true }}
            />
            <KpiStat
              label="Low Stock"
              value={stats.lowStockCount}
              unit="komponen"
              icon={<AlertTriangle className="h-4 w-4" />}
              accent="bad"
              delta={{ value: "perlu restock", muted: true }}
            />
            <KpiStat
              label="On-time Delivery"
              value={Math.round(stats.onTimeRate * 100)}
              unit="%"
              icon={<Timer className="h-4 w-4" />}
              accent="signal"
              delta={{ value: `lead ${stats.avgLeadTimeDays.toFixed(1)}h rata2`, muted: true }}
            />
          </>
        )}
      </div>

      {/* throughput + status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Throughput Produksi"
          subtitle="7 hari terakhir · unit selesai vs reject"
          icon={<Activity className="h-4 w-4" />}
          accent
        >
          <div className="h-64 w-full">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.throughput7d} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.copper} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={CHART.copper} stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="completed" name="Selesai" fill="url(#barCompleted)" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  <Line dataKey="reject" name="Reject" stroke={CHART.bad} strokeWidth={2} dot={{ r: 3, fill: CHART.bad }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Status Order" subtitle="Distribusi order aktif">
          <div className="space-y-3">
            {stats?.statusBreakdown.map((s) => {
              const meta = STATUS_META[s.status as OrderStatus];
              return (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-ink-dim">
                      <StatusLED tone={meta.tone} /> {meta.label}
                    </span>
                    <span className="data font-semibold text-ink">{s.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-snap"
                      style={{
                        width: `${(s.count / maxStatus) * 100}%`,
                        background: tonColor(meta.tone),
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {!stats && <Skeleton className="h-40" />}
          </div>
        </Panel>
      </div>

      {/* station util + alerts + due soon */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Utilisasi Workstation" subtitle="Slot aktif vs kapasitas" icon={<Boxes className="h-4 w-4" />}>
          <div className="space-y-4 pt-1">
            {stats?.stationUtilization.map((s) => {
              const ratio = s.capacity ? s.active / s.capacity : 0;
              return (
                <div key={s.station}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{STATION_META[s.station].label}</span>
                    <span className="data text-ink-dim">
                      {s.active}/{s.capacity}
                    </span>
                  </div>
                  <Progress value={ratio * 100} tone={ratio > 0.8 ? "bad" : ratio > 0.5 ? "warn" : "signal"} />
                </div>
              );
            })}
            {!stats && <Skeleton className="h-40" />}
          </div>
        </Panel>

        <Panel
          title="Low Stock Alert"
          subtitle="Di bawah minimum"
          icon={<AlertTriangle className="h-4 w-4" />}
          action={
            <Link to="/inventory" className="text-2xs font-semibold text-copper hover:text-copper-bright">
              Lihat semua
            </Link>
          }
        >
          <div className="space-y-2">
            {alerts?.rows.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-line bg-canvas-2 px-3 py-2">
                <StatusLED tone={c.available <= 0 ? "bad" : "hold"} />
                <div className="min-w-0 flex-1">
                  <p className="data truncate text-xs font-semibold text-ink">{c.partNumber}</p>
                  <p className="truncate text-2xs text-ink-faint">{c.supplierName}</p>
                </div>
                <div className="text-right">
                  <p className="data text-xs font-semibold text-bad">{num(c.available)}</p>
                  <p className="text-2xs text-ink-faint">min {num(c.minStock)}</p>
                </div>
              </div>
            ))}
            {alerts && alerts.rows.length === 0 && (
              <p className="py-6 text-center text-xs text-ink-dim">Semua stok aman 🎉</p>
            )}
            {!alerts && <Skeleton className="h-40" />}
          </div>
        </Panel>

        <Panel
          title="Order Mendekati Due"
          subtitle="Prioritas pengerjaan"
          action={
            <Link to="/orders" className="text-2xs font-semibold text-copper hover:text-copper-bright">
              Semua order
            </Link>
          }
        >
          <div className="space-y-2">
            {dueSoon?.items.slice(0, 5).map((o) => {
              const due = dueLabel(o.dueDate);
              return (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-line bg-canvas-2 px-3 py-2 transition-colors hover:border-copper/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="data truncate text-xs font-semibold text-ink">{o.code}</p>
                    <p className="truncate text-2xs text-ink-faint">{o.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-2xs font-semibold",
                        due.overdue ? "text-bad" : due.soon ? "text-warn" : "text-ink-dim",
                      )}
                    >
                      {due.text}
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </Link>
              );
            })}
            {!dueSoon && <Skeleton className="h-40" />}
          </div>
        </Panel>
      </div>

      {/* revenue footnote strip */}
      {stats && (
        <Panel pad={false} className="bg-canvas-2">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-ink-dim">
              <ArrowUpRight className="h-4 w-4 text-ok" /> WIP saat ini
              <span className="data font-semibold text-ink">{num(stats.wipUnits)} unit</span>
            </span>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="flex items-center gap-2 text-ink-dim">
              Reject hari ini
              <span className="data font-semibold text-bad">{stats.rejectsToday}</span>
            </span>
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="flex items-center gap-2 text-ink-dim">
              Order aktif total
              <span className="data font-semibold text-copper">{num(stats.activeOrders)}</span>
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}

function tonColor(tone: string): string {
  const map: Record<string, string> = {
    neutral: CHART.axis,
    info: CHART.info,
    live: CHART.signal,
    hold: CHART.warn,
    qc: CHART.qc,
    bad: CHART.bad,
    ok: CHART.ok,
    copper: CHART.copper,
  };
  return map[tone] ?? CHART.axis;
}
