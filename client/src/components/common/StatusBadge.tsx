import { cn } from "@/lib/cn";
import { PRIORITY_META, STATUS_META, TONE, type Tone } from "@/lib/domain";
import type { OrderStatus, Priority } from "@/types";
import { StatusLED } from "./StatusLED";

interface BadgeProps {
  tone: Tone;
  children: React.ReactNode;
  led?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ tone, children, led, pulse, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em]",
        TONE[tone].chip,
        className,
      )}
    >
      {led && <StatusLED tone={tone} pulse={pulse} className="h-1.5 w-1.5" />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} led pulse={status === "IN_PROD"} className={className}>
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}
