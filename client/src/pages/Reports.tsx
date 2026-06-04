import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, CheckCircle2, Clock, Coins, Package, Timer, XCircle } from "lucide-react";
import { STATION_META } from "@/lib/domain";
import { fmtDate, num, rupiahShort } from "@/lib/format";
import { api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { Panel } from "@/components/common/Panel";
import { KpiStat } from "@/components/common/KpiStat";
import { Segmented } from "@/components/common/Tabs";
import { Skeleton } from "@/components/common/feedback";
import { CHART, ChartTooltip, axisProps } from "@/components/common/chart";
import { ExportPanel } from "@/components/reports/ExportPanel";

type Tab = "daily" | "monthly";

export function Reports() {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: "daily", label: "Harian" },
            { value: "monthly", label: "Bulanan" },
          ]}
        />
      </div>

      {tab === "daily" ? <DailyReport /> : <MonthlyReport />}

      <ExportPanel scope={tab === "daily" ? "harian" : "bulanan"} />
    </div>
  );
}

function DailyReport() {
  const { data } = useAsync(() => api.reports.daily(), []);
  const chartData =
    data?.byStation.map((s) => ({
      name: STATION_META[s.station].label.split(" ")[0],
      Pass: s.pass,
      Fail: s.fail,
      Rework: s.rework,
    })) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-dim">
        Ringkasan produksi · <span className="data text-ink">{data ? fmtDate(data.date, "EEEE, d MMMM yyyy") : "—"}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data ? (
          <>
            <KpiStat label="Unit Selesai" value={data.unitsCompleted} icon={<Package className="h-4 w-4" />} accent="ok" />
            <KpiStat label="Reject" value={data.unitsReject} icon={<XCircle className="h-4 w-4" />} accent="bad" />
            <KpiStat label="Yield Rate" value={Math.round(data.yieldRate * 100)} unit="%" icon={<CheckCircle2 className="h-4 w-4" />} accent="signal" />
            <KpiStat label="Order Dikirim" value={data.ordersShipped} icon={<CalendarDays className="h-4 w-4" />} accent="copper" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[116px]" />)
        )}
      </div>

      <Panel title="Output per Workstation" subtitle="pass / fail / rework hari ini" accent>
        <div className="h-72 w-full">
          {data ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="Pass" stackId="a" fill={CHART.ok} radius={[0, 0, 0, 0]} maxBarSize={56} />
                <Bar dataKey="Rework" stackId="a" fill={CHART.warn} maxBarSize={56} />
                <Bar dataKey="Fail" stackId="a" fill={CHART.bad} radius={[4, 4, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full" />
          )}
        </div>
      </Panel>
    </div>
  );
}

function MonthlyReport() {
  const { data } = useAsync(() => api.reports.monthly(), []);
  const maxUnits = Math.max(1, ...(data?.topClients.map((c) => c.units) ?? [1]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-dim">
        Agregasi 30 hari terakhir · <span className="data text-ink">{data?.month ?? "—"}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {data ? (
          <>
            <KpiStat label="Total Unit" value={data.totalUnits} icon={<Package className="h-4 w-4" />} accent="copper" />
            <KpiStat label="Yield Rate" value={Math.round(data.yieldRate * 100)} unit="%" icon={<CheckCircle2 className="h-4 w-4" />} accent="ok" />
            <KpiStat label="On-time" value={Math.round(data.onTimeRate * 100)} unit="%" icon={<Timer className="h-4 w-4" />} accent="signal" />
            <KpiStat label="Avg Lead Time" value={data.avgLeadTimeDays} format={(n) => n.toFixed(1)} unit="hari" icon={<Clock className="h-4 w-4" />} accent="warn" />
            <KpiStat label="Revenue" value={data.revenue} format={rupiahShort} icon={<Coins className="h-4 w-4" />} accent="copper" />
          </>
        ) : (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[116px]" />)
        )}
      </div>

      <Panel title="Tren Produksi" subtitle="unit selesai vs reject · 30 hari" accent>
        <div className="h-72 w-full">
          {data ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="mUnits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.copper} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART.copper} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="day" {...axisProps} interval={3} />
                <YAxis {...axisProps} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="units" name="Unit" fill="url(#mUnits)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Line dataKey="reject" name="Reject" stroke={CHART.bad} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full" />
          )}
        </div>
      </Panel>

      <Panel title="Top Client" subtitle="berdasarkan volume unit">
        <div className="space-y-3">
          {data?.topClients.map((c, i) => (
            <div key={c.client}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink">
                  <span className="data text-ink-faint">{i + 1}.</span> {c.client}
                </span>
                <span className="data text-ink-dim">
                  {num(c.units)} unit · {c.orders} order
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-copper transition-[width] duration-700 ease-snap" style={{ width: `${(c.units / maxUnits) * 100}%` }} />
              </div>
            </div>
          ))}
          {!data && <Skeleton className="h-40" />}
        </div>
      </Panel>
    </div>
  );
}
