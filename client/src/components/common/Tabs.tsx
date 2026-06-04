import { cn } from "@/lib/cn";

interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

/** Segmented control / pill tabs. */
export function Segmented<T extends string>({ items, value, onChange, className }: Props<T>) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg border border-line bg-canvas-2 p-1", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "btn-press relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              active ? "bg-surface-3 text-ink shadow-sm" : "text-ink-dim hover:text-ink",
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  "data rounded px-1 text-[10px]",
                  active ? "bg-copper/20 text-copper" : "bg-surface-2 text-ink-faint",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
