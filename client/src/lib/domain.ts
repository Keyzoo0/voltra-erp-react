import type {
  OrderStatus,
  Priority,
  ProductionStatus,
  Role,
  Station,
} from "@/types";

// ─────────────────────────────────────────────────────────────
// Visual tones — map a semantic state to a coherent set of
// Tailwind classes (text / dot / soft chip). Keeps status colour
// logic in one place.
// ─────────────────────────────────────────────────────────────
export type Tone =
  | "neutral"
  | "info"
  | "live"
  | "hold"
  | "qc"
  | "bad"
  | "ok"
  | "copper";

interface ToneStyle {
  text: string;
  dot: string;
  chip: string; // bg + text + border for a badge
}

export const TONE: Record<Tone, ToneStyle> = {
  neutral: {
    text: "text-ink-dim",
    dot: "text-ink-faint",
    chip: "bg-surface-2 text-ink-dim border-line",
  },
  info: {
    text: "text-info",
    dot: "text-info",
    chip: "bg-info/10 text-info border-info/25",
  },
  live: {
    text: "text-signal",
    dot: "text-signal",
    chip: "bg-signal/10 text-signal border-signal/25",
  },
  hold: {
    text: "text-warn",
    dot: "text-warn",
    chip: "bg-warn/10 text-warn border-warn/25",
  },
  qc: {
    text: "text-qc",
    dot: "text-qc",
    chip: "bg-qc/10 text-qc border-qc/25",
  },
  bad: {
    text: "text-bad",
    dot: "text-bad",
    chip: "bg-bad/10 text-bad border-bad/25",
  },
  ok: {
    text: "text-ok",
    dot: "text-ok",
    chip: "bg-ok/10 text-ok border-ok/25",
  },
  copper: {
    text: "text-copper",
    dot: "text-copper",
    chip: "bg-copper/10 text-copper border-copper/25",
  },
};

// ── roles ─────────────────────────────────────────────────────
export const ROLES: Role[] = ["admin", "supervisor", "operator", "viewer"];

export const ROLE_META: Record<Role, { label: string; blurb: string }> = {
  admin: { label: "Admin", blurb: "Akses penuh — kelola user, order, stok, laporan." },
  supervisor: { label: "Supervisor", blurb: "Kelola order & produksi, adjust stok, export laporan." },
  operator: { label: "Operator", blurb: "Scan & update produksi di workstation sendiri." },
  viewer: { label: "Viewer", blurb: "Read-only — lihat inventory & laporan (manajemen)." },
};

// ── order status ──────────────────────────────────────────────
export const ORDER_STATUSES: OrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROD",
  "ON_HOLD",
  "QC",
  "QC_FAIL",
  "PACKING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; short: string; tone: Tone; desc: string }
> = {
  DRAFT: { label: "Draft", short: "DRAFT", tone: "neutral", desc: "Order dibuat, belum dikonfirmasi." },
  CONFIRMED: { label: "Confirmed", short: "CONF", tone: "info", desc: "Stok di-reserve, masuk antrian produksi." },
  IN_PROD: { label: "In Production", short: "PROD", tone: "live", desc: "Sedang dikerjakan di workstation." },
  ON_HOLD: { label: "On Hold", short: "HOLD", tone: "hold", desc: "Tertahan — biasanya nunggu komponen." },
  QC: { label: "Quality Control", short: "QC", tone: "qc", desc: "Inspeksi & functional test." },
  QC_FAIL: { label: "QC Failed", short: "FAIL", tone: "bad", desc: "Gagal QC — rework balik ke produksi." },
  PACKING: { label: "Packing", short: "PACK", tone: "copper", desc: "Lolos QC, sedang dikemas." },
  SHIPPED: { label: "Shipped", short: "SHIP", tone: "info", desc: "Sudah dikirim ke client." },
  COMPLETED: { label: "Completed", short: "DONE", tone: "ok", desc: "Selesai & diterima client." },
  CANCELLED: { label: "Cancelled", short: "CANCEL", tone: "neutral", desc: "Dibatalkan, stok dilepas." },
};

// finite-state-machine transitions (DESIGN.md §4)
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROD", "ON_HOLD", "CANCELLED"],
  IN_PROD: ["QC", "ON_HOLD"],
  ON_HOLD: ["IN_PROD", "CONFIRMED", "CANCELLED"],
  QC: ["QC_FAIL", "PACKING"],
  QC_FAIL: ["IN_PROD"],
  PACKING: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** statuses considered "active" (not terminal). */
export const ACTIVE_STATUSES: OrderStatus[] = ORDER_STATUSES.filter(
  (s) => s !== "COMPLETED" && s !== "CANCELLED",
);

// ── priority ──────────────────────────────────────────────────
export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];

export const PRIORITY_META: Record<
  Priority,
  { label: string; tone: Tone; weight: number }
> = {
  low: { label: "Low", tone: "neutral", weight: 0 },
  normal: { label: "Normal", tone: "info", weight: 1 },
  high: { label: "High", tone: "hold", weight: 2 },
  urgent: { label: "Urgent", tone: "bad", weight: 3 },
};

// ── workstations ──────────────────────────────────────────────
export const STATIONS: Station[] = ["reflow", "solder", "test", "assembly"];

export const STATION_META: Record<
  Station,
  { label: string; icon: string; accent: string; capacity: number }
> = {
  reflow: { label: "Reflow Oven", icon: "flame", accent: "text-bad", capacity: 4 },
  solder: { label: "Manual Solder", icon: "iron", accent: "text-copper", capacity: 5 },
  test: { label: "Testing", icon: "scope", accent: "text-signal", capacity: 3 },
  assembly: { label: "Assembly", icon: "boxes", accent: "text-ok", capacity: 4 },
};

export const PRODUCTION_STATUS_META: Record<
  ProductionStatus,
  { label: string; tone: Tone }
> = {
  pass: { label: "Pass", tone: "ok" },
  fail: { label: "Fail", tone: "bad" },
  rework: { label: "Rework", tone: "hold" },
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function isTerminal(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
