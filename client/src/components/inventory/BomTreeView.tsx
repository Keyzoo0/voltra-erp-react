import { useState } from "react";
import { ChevronRight, Cpu } from "lucide-react";
import type { Bom } from "@/types";
import type { ComponentRow } from "@/mock/api";
import { num, rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StatusLED } from "@/components/common/StatusLED";

type BomRow = Bom & { unitCost: number; lineCount: number };

interface Props {
  boms: BomRow[];
  componentMap: Map<string, ComponentRow>;
}

export function BomTreeView({ boms, componentMap }: Props) {
  const [open, setOpen] = useState<string | null>(boms[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {boms.map((bom) => {
        const expanded = open === bom.id;
        return (
          <div key={bom.id} className="overflow-hidden rounded-xl border border-line">
            <button
              onClick={() => setOpen(expanded ? null : bom.id)}
              className="flex w-full items-center gap-3 bg-canvas-2 px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
            >
              <ChevronRight className={cn("h-4 w-4 shrink-0 text-ink-faint transition-transform", expanded && "rotate-90 text-copper")} />
              <Cpu className="h-4 w-4 shrink-0 text-copper" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {bom.pcbName} <span className="text-ink-faint">· rev {bom.revision}</span>
                </p>
                <p className="data text-2xs text-ink-faint">{bom.lineCount} komponen</p>
              </div>
              <div className="text-right">
                <p className="data text-sm font-semibold text-copper">{rupiah(bom.unitCost)}</p>
                <p className="label">BOM cost / unit</p>
              </div>
            </button>

            {expanded && (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="label px-4 py-2 text-left">Ref</th>
                      <th className="label px-4 py-2 text-left">Part Number</th>
                      <th className="label px-4 py-2 text-right">Qty/unit</th>
                      <th className="label px-4 py-2 text-right">Stok tersedia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.lines.map((line) => {
                      const comp = componentMap.get(line.componentId);
                      return (
                        <tr key={line.id} className="border-b border-line/50 last:border-0">
                          <td className="px-4 py-2">
                            <span className="data text-xs font-semibold text-copper">{line.designator}</span>
                          </td>
                          <td className="px-4 py-2">
                            <p className="data text-xs font-medium text-ink">{comp?.partNumber ?? "—"}</p>
                            <p className="truncate text-2xs text-ink-faint">{comp?.description}</p>
                          </td>
                          <td className="data px-4 py-2 text-right text-ink">{line.qtyPerUnit}</td>
                          <td className="px-4 py-2 text-right">
                            <span className="inline-flex items-center justify-end gap-1.5">
                              <StatusLED tone={comp?.low ? "bad" : "ok"} />
                              <span className={cn("data", comp?.low ? "text-bad" : "text-ink-dim")}>
                                {num(comp?.available ?? 0)}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
