import { useState } from "react";
import { ScanLine } from "lucide-react";
import type { Station } from "@/types";
import { STATIONS, STATION_META } from "@/lib/domain";
import { ApiError, api } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { toast } from "@/stores/ui";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Field, Select } from "@/components/common/Form";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ScanModal({ open, onClose }: Props) {
  const { data } = useAsync(() => api.orders.list({ activeOnly: true, pageSize: 50, sortBy: "dueDate", sortDir: "asc" }), []);
  const [orderId, setOrderId] = useState("");
  const [station, setStation] = useState<Station>("reflow");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!orderId) return;
    setBusy(true);
    try {
      const detail = await api.orders.get(orderId);
      const bd = detail.breakdown[0];
      api.production.scan({
        orderId: detail.order.id,
        orderCode: detail.order.code,
        client: detail.order.client,
        bomName: bd?.bom.pcbName ?? "—",
        revision: bd?.bom.revision ?? "—",
        quantity: bd?.quantity ?? detail.order.items[0]?.quantity ?? 0,
        priority: detail.order.priority,
        dueDate: detail.order.dueDate,
        station,
      });
      toast.success("Order di-scan", `${detail.order.code} → ${STATION_META[station].label}`);
      setOrderId("");
      onClose();
    } catch (e) {
      toast.error("Gagal scan", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const orderOptions = [
    { value: "", label: "— pilih order —" },
    ...(data?.items ?? []).map((o) => ({ value: o.id, label: `${o.code} · ${o.client}` })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan Order ke Workstation"
      subtitle="Simulasi barcode scan — assign order ke antrian station."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon={<ScanLine className="h-4 w-4" />} onClick={submit} loading={busy} disabled={!orderId}>
            Scan & Assign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center rounded-lg border border-dashed border-line-strong bg-canvas-2 py-6">
          <ScanLine className="h-10 w-10 text-copper" />
        </div>
        <Field label="Order">
          <Select value={orderId} onChange={(e) => setOrderId(e.target.value)} options={orderOptions} />
        </Field>
        <Field label="Workstation">
          <Select
            value={station}
            onChange={(e) => setStation(e.target.value as Station)}
            options={STATIONS.map((s) => ({ value: s, label: STATION_META[s].label }))}
          />
        </Field>
      </div>
    </Modal>
  );
}
