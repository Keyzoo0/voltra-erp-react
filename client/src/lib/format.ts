import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("id-ID");

/** Rupiah, no decimals: 1.250.000 → "Rp 1.250.000". */
export function rupiah(value: number): string {
  return IDR.format(Math.round(value)).replace("Rp", "Rp ");
}

/** Compact rupiah for tight spaces: 1_250_000 → "Rp 1,25 jt". */
export function rupiahShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
  if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`;
  return rupiah(value);
}

export function num(value: number): string {
  return NUM.format(value);
}

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function fmtDate(value: string | Date, pattern = "d MMM yyyy"): string {
  const d = toDate(value);
  return isValid(d) ? format(d, pattern) : "—";
}

export function fmtDateTime(value: string | Date): string {
  return fmtDate(value, "d MMM yyyy, HH:mm");
}

export function fmtTime(value: string | Date): string {
  return fmtDate(value, "HH:mm");
}

export function fromNow(value: string | Date): string {
  const d = toDate(value);
  if (!isValid(d)) return "—";
  return `${formatDistanceToNowStrict(d, { addSuffix: false })} lalu`;
}

/** days until a due date — negative means overdue. */
export function daysUntil(value: string | Date): number {
  const d = toDate(value);
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function dueLabel(value: string | Date): { text: string; overdue: boolean; soon: boolean } {
  const days = daysUntil(value);
  if (days < 0) return { text: `Telat ${Math.abs(days)}h`, overdue: true, soon: false };
  if (days === 0) return { text: "Hari ini", overdue: false, soon: true };
  if (days === 1) return { text: "Besok", overdue: false, soon: true };
  return { text: `${days} hari lagi`, overdue: false, soon: days <= 3 };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
