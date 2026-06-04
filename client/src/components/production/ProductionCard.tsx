import { motion } from "framer-motion";
import { ChevronRight, Clock } from "lucide-react";
import type { QueueCard, User } from "@/types";
import { dueLabel, fromNow } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PriorityBadge } from "@/components/common/StatusBadge";
import { StatusLED } from "@/components/common/StatusLED";
import { Avatar } from "@/components/common/Avatar";

interface Props {
  card: QueueCard;
  operator?: User;
  canAdvance: boolean;
  onAdvance: (id: string) => void;
}

export function ProductionCard({ card, operator, canAdvance, onAdvance }: Props) {
  const active = card.state === "in_progress";
  const due = dueLabel(card.dueDate);

  return (
    <motion.div
      layout
      layoutId={card.id}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "group rounded-lg border bg-surface p-3 transition-colors",
        active ? "border-copper/40 shadow-[0_0_0_1px_rgb(var(--copper)/0.15),0_8px_24px_-12px_rgb(var(--copper)/0.4)]" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <StatusLED tone={active ? "live" : "neutral"} pulse={active} />
          <span className="data text-xs font-semibold text-ink">{card.orderCode}</span>
        </span>
        <PriorityBadge priority={card.priority} />
      </div>

      <div className="mt-2">
        <p className="truncate text-sm font-medium text-ink">
          {card.bomName} <span className="text-2xs text-ink-faint">rev {card.revision}</span>
        </p>
        <p className="truncate text-2xs text-ink-faint">{card.client}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
        <div className="flex items-center gap-2 text-2xs">
          <span className="data rounded bg-surface-2 px-1.5 py-0.5 font-semibold text-ink-dim">{card.quantity} unit</span>
          <span className={cn("font-semibold", due.overdue ? "text-bad" : due.soon ? "text-warn" : "text-ink-faint")}>{due.text}</span>
        </div>
        <div className="flex items-center gap-2">
          {active && operator ? (
            <Avatar user={operator} size="sm" />
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs text-ink-faint">
              <Clock className="h-3 w-3" />
              {fromNow(card.enteredAt)}
            </span>
          )}
          {canAdvance && (
            <button
              onClick={() => onAdvance(card.id)}
              title={active ? "Selesaikan & lanjut station" : "Mulai kerjakan"}
              className="rounded-md border border-line bg-surface-2 p-1 text-ink-faint transition-colors hover:border-copper/50 hover:text-copper"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
