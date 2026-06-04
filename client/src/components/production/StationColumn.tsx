import { AnimatePresence } from "framer-motion";
import { Activity, Boxes, Flame, Wrench, type LucideIcon } from "lucide-react";
import type { QueueCard, Station, User } from "@/types";
import { PRIORITY_META, STATION_META } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { ProductionCard } from "./ProductionCard";

const ICONS: Record<string, LucideIcon> = { flame: Flame, iron: Wrench, scope: Activity, boxes: Boxes };

interface Props {
  station: Station;
  cards: QueueCard[];
  userMap: Map<string, User>;
  canAdvance: boolean;
  onAdvance: (id: string) => void;
}

export function StationColumn({ station, cards, userMap, canAdvance, onAdvance }: Props) {
  const meta = STATION_META[station];
  const Icon = ICONS[meta.icon] ?? Boxes;
  const inProgress = cards.filter((c) => c.state === "in_progress").length;
  const queued = cards.length - inProgress;

  const sorted = [...cards].sort((a, b) => {
    if (a.state !== b.state) return a.state === "in_progress" ? -1 : 1;
    const pw = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
    if (pw) return pw;
    return +new Date(a.dueDate) - +new Date(b.dueDate);
  });

  const load = Math.min(1, inProgress / meta.capacity);

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-line bg-canvas-2/60">
      <header className="border-b border-line p-3">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2", meta.accent)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{meta.label}</p>
            <p className="data text-2xs text-ink-faint">
              {inProgress} aktif · {queued} antri
            </p>
          </div>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn("h-full rounded-full transition-all duration-500", load > 0.8 ? "bg-bad" : load > 0.5 ? "bg-warn" : "bg-signal")}
            style={{ width: `${load * 100}%` }}
          />
        </div>
      </header>

      <div className="flex max-h-[460px] min-h-[120px] flex-col gap-2 overflow-y-auto p-2.5">
        <AnimatePresence mode="popLayout">
          {sorted.map((card) => (
            <ProductionCard
              key={card.id}
              card={card}
              operator={card.operatorId ? userMap.get(card.operatorId) : undefined}
              canAdvance={canAdvance}
              onAdvance={onAdvance}
            />
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <p className="py-8 text-center text-2xs text-ink-faint">Station idle</p>
        )}
      </div>
    </div>
  );
}
