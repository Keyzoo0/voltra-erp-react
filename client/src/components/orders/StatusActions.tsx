import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { STATUS_META, TONE } from "@/lib/domain";
import { ApiError, api } from "@/mock/api";
import { useAuth } from "@/stores/auth";
import { toast } from "@/stores/ui";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Field, Textarea } from "@/components/common/Form";
import { StatusLED } from "@/components/common/StatusLED";

const SIDE_EFFECT: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Stok komponen untuk order ini akan di-reserve otomatis.",
  CANCELLED: "Reservasi stok (jika ada) akan dilepas kembali.",
  SHIPPED: "Stok komponen akan dikurangi final dari inventory.",
};

interface Props {
  order: Order;
  nextStatuses: OrderStatus[];
  onChanged: () => void;
}

export function StatusActions({ order, nextStatuses, onChanged }: Props) {
  const user = useAuth((s) => s.user);
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!nextStatuses.length) {
    return <span className="text-2xs text-ink-faint">Order sudah final — tidak ada transisi.</span>;
  }

  const confirm = async () => {
    if (!target || !user) return;
    setSubmitting(true);
    try {
      await api.orders.updateStatus(order.id, target, user.id, notes);
      toast.success("Status diperbarui", `${order.code} → ${STATUS_META[target].label}`);
      setTarget(null);
      setNotes("");
      onChanged();
    } catch (e) {
      toast.error("Gagal update status", e instanceof ApiError ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {nextStatuses.map((s) => {
          const meta = STATUS_META[s];
          const danger = s === "CANCELLED" || s === "QC_FAIL";
          return (
            <button
              key={s}
              onClick={() => setTarget(s)}
              className={cn(
                "btn-press inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors",
                danger
                  ? "border-bad/30 bg-bad/10 text-bad hover:bg-bad/20"
                  : "border-line-strong bg-surface-2 text-ink hover:border-copper/50 hover:text-copper",
              )}
            >
              <StatusLED tone={meta.tone} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Ubah Status Order"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={confirm} loading={submitting}>
              Konfirmasi
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 rounded-lg border border-line bg-canvas-2 py-3">
              <span className={cn("flex items-center gap-1.5 text-sm font-semibold", TONE[STATUS_META[order.status].tone].text)}>
                <StatusLED tone={STATUS_META[order.status].tone} /> {STATUS_META[order.status].label}
              </span>
              <ArrowRight className="h-4 w-4 text-ink-faint" />
              <span className={cn("flex items-center gap-1.5 text-sm font-semibold", TONE[STATUS_META[target].tone].text)}>
                <StatusLED tone={STATUS_META[target].tone} /> {STATUS_META[target].label}
              </span>
            </div>

            {SIDE_EFFECT[target] && (
              <p className="rounded-lg border border-copper/20 bg-copper/5 px-3 py-2 text-xs text-copper">
                {SIDE_EFFECT[target]}
              </p>
            )}

            <Field label="Catatan" hint="opsional">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alasan / catatan transisi…" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
