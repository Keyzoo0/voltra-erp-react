import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, History, Layers, Wrench } from "lucide-react";
import type { ProductionStatus, User } from "@/types";
import { PRODUCTION_STATUS_META, STATION_META } from "@/lib/domain";
import { dueLabel, fmtDate, fmtDateTime, rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useCan } from "@/hooks/useCan";
import { Panel } from "@/components/common/Panel";
import { Skeleton, ErrorState, EmptyState } from "@/components/common/feedback";
import { Badge, OrderStatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { BomBreakdown } from "@/components/orders/BomBreakdown";
import { StatusActions } from "@/components/orders/StatusActions";

function Def({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

export function OrderDetail() {
  const { id = "" } = useParams();
  const can = useCan();
  const { data, loading, error, refetch } = useAsync(() => api.orders.get(id), [id]);
  const { data: users } = useAsync(() => api.users.list(), []);
  const userMap = new Map((users ?? []).map((u: User) => [u.id, u]));

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Orders
        </Link>
        <Panel>
          <ErrorState message={error?.message} onRetry={refetch} />
        </Panel>
      </div>
    );
  }

  const { order, createdBy, logs, production, breakdown, nextStatuses } = data;
  const due = dueLabel(order.dueDate);

  return (
    <div className="space-y-5">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Orders
      </Link>

      {/* header */}
      <Panel accent>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="data text-2xl font-bold tracking-tight text-ink">{order.code}</h2>
              <OrderStatusBadge status={order.status} />
              <PriorityBadge priority={order.priority} />
            </div>
            <p className="mt-1.5 text-sm text-ink-dim">
              {order.client} · jatuh tempo {fmtDate(order.dueDate)}{" "}
              <span className={cn("font-semibold", due.overdue ? "text-bad" : due.soon ? "text-warn" : "text-ink-faint")}>
                ({due.text})
              </span>
            </p>
          </div>
          {can("order.status") && (
            <div className="text-right">
              <p className="label mb-2">Transisi Status</p>
              <StatusActions order={order} nextStatuses={nextStatuses} onChanged={refetch} />
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Informasi Order" icon={<FileText className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Def label="Client">{order.client}</Def>
              <Def label="Dibuat oleh">{createdBy?.name ?? "—"}</Def>
              <Def label="Tanggal dibuat">{fmtDate(order.createdAt)}</Def>
              <Def label="Prioritas">
                <PriorityBadge priority={order.priority} />
              </Def>
              <Def label="Jumlah item">{order.items.length} item</Def>
              <Def label="Total nilai">
                <span className="data font-semibold text-copper">{rupiah(order.totalCost)}</span>
              </Def>
            </div>
            {order.notes && (
              <div className="mt-4 rounded-lg border border-line bg-canvas-2 px-3 py-2 text-sm text-ink-dim">
                <span className="label mb-1 block">Catatan</span>
                {order.notes}
              </div>
            )}
          </Panel>

          <Panel title="BOM & Ketersediaan Stok" icon={<Layers className="h-4 w-4" />} subtitle={`${breakdown.length} item · cross-check inventory`}>
            <div className="space-y-3">
              {breakdown.map((b) => (
                <BomBreakdown key={b.orderItemId} breakdown={b} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Riwayat Status" icon={<History className="h-4 w-4" />}>
            <OrderTimeline logs={logs} userMap={userMap} />
          </Panel>

          <Panel title="Riwayat Produksi" icon={<Wrench className="h-4 w-4" />} subtitle={`${production.length} log workstation`}>
            {production.length === 0 ? (
              <EmptyState title="Belum masuk produksi" description="Log akan muncul saat order mulai dikerjakan." />
            ) : (
              <div className="space-y-2">
                {production.map((p) => {
                  const dur = p.completedAt
                    ? Math.round((+new Date(p.completedAt) - +new Date(p.startedAt)) / 60000)
                    : null;
                  const meta = PRODUCTION_STATUS_META[p.status as ProductionStatus];
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border border-line bg-canvas-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{STATION_META[p.station].label}</p>
                        <p className="text-2xs text-ink-faint">
                          {userMap.get(p.operatorId)?.name ?? "—"} · {fmtDateTime(p.startedAt)}
                          {dur != null && <span className="data"> · {dur}m</span>}
                        </p>
                      </div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
