import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  accent?: boolean;
  pad?: boolean;
}

export function Panel({
  children,
  className,
  bodyClassName,
  title,
  subtitle,
  icon,
  action,
  accent,
  pad = true,
}: PanelProps) {
  const hasHeader = title || action;
  return (
    <section className={cn("panel relative overflow-hidden", className)}>
      {accent && <div className="rule-copper absolute inset-x-0 top-0 h-px" />}
      {hasHeader && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="text-copper">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>}
              {subtitle && <p className="truncate text-xs text-ink-dim">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn(pad && "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
