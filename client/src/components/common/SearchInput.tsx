import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Cari…", className }: Props) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-canvas-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-copper/60 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
          aria-label="Bersihkan"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
