import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Star } from "lucide-react";
import { fmtDateTime, num, rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ApiError, api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useCan } from "@/hooks/useCan";
import { toast } from "@/stores/ui";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Form";
import { Skeleton, ErrorState } from "@/components/common/feedback";
import { Badge } from "@/components/common/StatusBadge";
import { StatusLED } from "@/components/common/StatusLED";

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-canvas-2 px-3 py-2">
      <p className="label">{label}</p>
      <p className={cn("data mt-0.5 text-lg font-semibold", tone ?? "text-ink")}>{value}</p>
    </div>
  );
}

function Body({ id, onChanged }: { id: string; onChanged: () => void }) {
  const can = useCan();
  const { data, loading, error, refetch } = useAsync(() => api.inventory.get(id), [id]);
  const [delta, setDelta] = useState(0);
  const [busy, setBusy] = useState(false);

  if (loading) return <Skeleton className="h-72" />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={refetch} />;

  const { component: c, supplier, usedIn } = data;

  const apply = async () => {
    if (!delta) return;
    setBusy(true);
    try {
      await api.inventory.adjust(c.id, delta, c.version);
      toast.success("Stok diupdate", `${c.partNumber} ${delta > 0 ? "+" : ""}${delta}`);
      setDelta(0);
      refetch();
      onChanged();
    } catch (e) {
      toast.error("Gagal update stok", e instanceof ApiError ? e.message : undefined);
      refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="data text-lg font-bold text-ink">{c.partNumber}</p>
          <p className="text-sm text-ink-dim">{c.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{c.category}</Badge>
            <Badge tone="neutral">{c.packageType}</Badge>
            <span className="data text-2xs text-ink-faint">bin {c.location}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="label">Status</p>
          <span className={cn("mt-1 inline-flex items-center gap-1.5 text-sm font-semibold", c.low ? "text-bad" : "text-ok")}>
            <StatusLED tone={c.low ? "bad" : "ok"} /> {c.low ? "Low Stock" : "Aman"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tersedia" value={num(c.available)} tone={c.low ? "text-bad" : "text-ink"} />
        <Stat label="Stok Fisik" value={num(c.stockQty)} />
        <Stat label="Reserved" value={num(c.reservedQty)} tone="text-warn" />
        <Stat label="Min Stok" value={num(c.minStock)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-canvas-2 p-3">
          <p className="label mb-2">Supplier</p>
          <p className="text-sm font-semibold text-ink">{supplier?.name ?? "—"}</p>
          <p className="text-2xs text-ink-faint">{supplier?.country}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-ink-dim">
            <span className="data">lead {supplier?.leadTimeDays}h</span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-copper text-copper" /> {supplier?.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-canvas-2 p-3">
          <p className="label mb-2">Harga & Versi</p>
          <p className="data text-sm font-semibold text-copper">{rupiah(c.unitCost)} <span className="text-2xs font-normal text-ink-faint">/unit</span></p>
          <p className="mt-1 text-2xs text-ink-faint">
            optimistic-lock v{c.version} · update {fmtDateTime(c.updatedAt)}
          </p>
        </div>
      </div>

      {usedIn.length > 0 && (
        <div>
          <p className="label mb-1.5">Dipakai di {usedIn.length} BOM</p>
          <div className="flex flex-wrap gap-1.5">
            {usedIn.map((b) => (
              <span key={b.id} className="rounded-md border border-line bg-surface-2 px-2 py-1 text-2xs text-ink-dim">
                {b.pcbName} <span className="text-ink-faint">rev {b.revision}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {can("inventory.adjust") && (
        <div className="rounded-lg border border-copper/20 bg-copper/5 p-3">
          <p className="label mb-2 text-copper">Adjust Stok (manual)</p>
          <div className="flex items-center gap-2">
            <Button variant="subtle" size="sm" icon={<Minus className="h-4 w-4" />} onClick={() => setDelta((d) => d - 10)} />
            <Input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Math.trunc(+e.target.value || 0))}
              className="w-28 text-center"
            />
            <Button variant="subtle" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDelta((d) => d + 10)} />
            <Button variant="primary" size="sm" onClick={apply} loading={busy} disabled={!delta} className="ml-auto">
              Terapkan ({delta > 0 ? `+${delta}` : delta})
            </Button>
          </div>
          <Link to="/inventory" className="mt-1 block text-2xs text-ink-faint">
            Optimistic locking mencegah race-condition saat dua orang adjust bersamaan.
          </Link>
        </div>
      )}
    </div>
  );
}

interface Props {
  componentId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ComponentDetailModal({ componentId, onClose, onChanged }: Props) {
  return (
    <Modal open={componentId !== null} onClose={onClose} title="Detail Komponen" size="lg">
      {componentId && <Body id={componentId} onChanged={onChanged} />}
    </Modal>
  );
}
