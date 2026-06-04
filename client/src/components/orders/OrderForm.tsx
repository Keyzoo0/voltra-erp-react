import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import type { Bom, Order, Priority } from "@/types";
import { PRIORITIES, PRIORITY_META } from "@/lib/domain";
import { rupiah } from "@/lib/format";
import { ApiError, api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/stores/auth";
import { toast } from "@/stores/ui";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Field, Input, Select } from "@/components/common/Form";

interface LineDraft {
  key: string;
  bomId: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

const MARGIN = 1.4; // matches api.orders.create

function newLine(bomId = ""): LineDraft {
  return { key: Math.random().toString(36).slice(2), bomId, quantity: 20 };
}

export function OrderForm({ open, onClose, onCreated }: Props) {
  const user = useAuth((s) => s.user);
  const { data: boms } = useAsync(() => api.boms.list(), []);
  const bomMap = useMemo(() => new Map((boms ?? []).map((b) => [b.id, b])), [boms]);

  const [client, setClient] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [dueDate, setDueDate] = useState(() => format(new Date(Date.now() + 14 * 86_400_000), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const lineCost = (l: LineDraft) => {
    const bom = bomMap.get(l.bomId) as (Bom & { unitCost: number }) | undefined;
    return bom ? Math.round(bom.unitCost * MARGIN) * l.quantity : 0;
  };
  const grandTotal = lines.reduce((s, l) => s + lineCost(l), 0);
  const valid = client.trim() && lines.every((l) => l.bomId && l.quantity > 0);

  const reset = () => {
    setClient("");
    setPriority("normal");
    setNotes("");
    setLines([newLine()]);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (!valid || !user) return;
    setSubmitting(true);
    try {
      const order = await api.orders.create({
        client,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        notes,
        createdBy: user.id,
        items: lines.map((l) => ({ bomId: l.bomId, quantity: l.quantity })),
      });
      toast.success("Order dibuat", `${order.code} · status DRAFT`);
      onCreated(order);
      reset();
      onClose();
    } catch (e) {
      toast.error("Gagal membuat order", e instanceof ApiError ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const bomOptions = [
    { value: "", label: "— pilih PCB / BOM —" },
    ...(boms ?? []).map((b) => ({ value: b.id, label: `${b.pcbName} · rev ${b.revision}` })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat Order Baru"
      subtitle="Order dibuat sebagai DRAFT — stok di-reserve saat dikonfirmasi."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={submitting} disabled={!valid}>
            Buat Order
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" error={touched && !client.trim() ? "Wajib diisi" : undefined}>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="PT / CV client" />
          </Field>
          <Field label="Prioritas">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
            />
          </Field>
          <Field label="Due Date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Catatan" hint="opsional">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan order…" />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Item Order</span>
            <button
              onClick={() => setLines((l) => [...l, newLine()])}
              className="inline-flex items-center gap-1 text-2xs font-semibold text-copper hover:text-copper-bright"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah item
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="flex items-end gap-2 rounded-lg border border-line bg-canvas-2 p-2.5">
                <Field label="BOM" className="flex-1">
                  <Select
                    value={line.bomId}
                    onChange={(e) =>
                      setLines((ls) => ls.map((x) => (x.key === line.key ? { ...x, bomId: e.target.value } : x)))
                    }
                    options={bomOptions}
                  />
                </Field>
                <Field label="Qty" className="w-24">
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((x) => (x.key === line.key ? { ...x, quantity: Math.max(1, +e.target.value || 0) } : x)),
                      )
                    }
                  />
                </Field>
                <div className="w-32 pb-1 text-right">
                  <p className="label">Subtotal</p>
                  <p className="data text-sm font-semibold text-ink">{rupiah(lineCost(line))}</p>
                </div>
                <button
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== line.key) : ls))}
                  disabled={lines.length === 1}
                  className="mb-1.5 rounded-lg p-2 text-ink-faint hover:text-bad disabled:opacity-30"
                  aria-label="Hapus item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-copper/20 bg-copper/5 px-4 py-3">
          <span className="text-sm text-ink-dim">Estimasi total order</span>
          <span className="data text-lg font-bold text-copper">{rupiah(grandTotal)}</span>
        </div>
      </div>
    </Modal>
  );
}
