import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("h-7 w-7", className)} aria-hidden>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7" className="fill-surface-2 stroke-line-strong" strokeWidth="1.5" />
      <rect x="9" y="9" width="14" height="14" rx="2.5" className="fill-canvas stroke-copper" strokeWidth="1.5" />
      <rect x="13" y="13" width="6" height="6" rx="1" className="fill-copper" />
      <g className="stroke-signal" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 9V5.5M16 9V5.5M20 9V5.5" />
        <path d="M12 23V26.5M16 23V26.5M20 23V26.5" />
        <path d="M9 12H5.5M9 16H5.5M9 20H5.5" />
        <path d="M23 12H26.5M23 16H26.5M23 20H26.5" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-lg font-extrabold tracking-tight text-ink">
          VOLTRA<span className="text-copper">.</span>
        </div>
        <div className="label mt-0.5 text-ink-faint">ERP · Production</div>
      </div>
    </div>
  );
}
