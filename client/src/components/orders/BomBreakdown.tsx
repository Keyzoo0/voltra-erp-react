import { AlertTriangle, CheckCircle2, Cpu } from "lucide-react";
import type { OrderBomBreakdown } from "@/types";
import { num, rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/common/StatusBadge";

export function BomBreakdown({ breakdown }: { breakdown: OrderBomBreakdown }) {
  const { bom, quantity, lines, shortageCount, bomUnitCost } = breakdown;

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-canvas-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Cpu className="h-4 w-4 shrink-0 text-copper" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {bom.pcbName} <span className="text-ink-faint">· rev {bom.revision}</span>
            </p>
            <p className="data text-2xs text-ink-faint">
              {num(quantity)} unit × {rupiah(bomUnitCost)} BOM cost
            </p>
          </div>
        </div>
        {shortageCount > 0 ? (
          <Badge tone="bad">
            <AlertTriangle className="h-3 w-3" /> {shortageCount} kurang
          </Badge>
        ) : (
          <Badge tone="ok">
            <CheckCircle2 className="h-3 w-3" /> Stok cukup
          </Badge>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="label px-4 py-2 text-left">Ref</th>
              <th className="label px-4 py-2 text-left">Komponen</th>
              <th className="label px-4 py-2 text-right">Butuh</th>
              <th className="label px-4 py-2 text-right">Tersedia</th>
              <th className="label px-4 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ line, component, required, available, sufficient }) => (
              <tr key={line.id} className="border-b border-line/50 last:border-0">
                <td className="px-4 py-2">
                  <span className="data text-xs font-semibold text-copper">{line.designator}</span>
                </td>
                <td className="px-4 py-2">
                  <p className="data text-xs font-medium text-ink">{component.partNumber}</p>
                  <p className="truncate text-2xs text-ink-faint">{component.description}</p>
                </td>
                <td className="data px-4 py-2 text-right text-ink">{num(required)}</td>
                <td className={cn("data px-4 py-2 text-right", sufficient ? "text-ink-dim" : "text-bad")}>
                  {num(available)}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-md",
                      sufficient ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad",
                    )}
                  >
                    {sufficient ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
