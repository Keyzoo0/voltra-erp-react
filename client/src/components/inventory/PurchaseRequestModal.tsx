import type { PurchaseRequestLine } from "@/types";
import { num, rupiah } from "@/lib/format";
import { toast } from "@/stores/ui";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  lines: PurchaseRequestLine[];
}

export function PurchaseRequestModal({ open, onClose, lines }: Props) {
  const total = lines.reduce((s, l) => s + l.suggestedQty * l.unitCost, 0);

  const generate = () => {
    toast.success("Purchase Request dibuat", `${lines.length} komponen · draft PR dikirim ke purchasing.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Draft Purchase Request"
      subtitle="Auto-generate untuk komponen di bawah minimum stok"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
          <Button variant="primary" onClick={generate} disabled={!lines.length}>
            Generate PR ({lines.length})
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="label px-3 py-2 text-left">Part Number</th>
              <th className="label px-3 py-2 text-left">Supplier</th>
              <th className="label px-3 py-2 text-right">Kurang</th>
              <th className="label px-3 py-2 text-right">Saran Order</th>
              <th className="label px-3 py-2 text-right">Estimasi</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.componentId} className="border-b border-line/50 last:border-0">
                <td className="px-3 py-2">
                  <p className="data text-xs font-semibold text-ink">{l.partNumber}</p>
                  <p className="truncate text-2xs text-ink-faint">{l.description}</p>
                </td>
                <td className="px-3 py-2 text-xs text-ink-dim">{l.supplierName}</td>
                <td className="data px-3 py-2 text-right text-bad">{num(l.shortBy)}</td>
                <td className="data px-3 py-2 text-right text-ink">{num(l.suggestedQty)}</td>
                <td className="data px-3 py-2 text-right text-ink-dim">{rupiah(l.suggestedQty * l.unitCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td colSpan={4} className="px-3 py-2.5 text-right text-sm font-medium text-ink-dim">
                Total estimasi PR
              </td>
              <td className="data px-3 py-2.5 text-right text-base font-bold text-copper">{rupiah(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
}
