// ─────────────────────────────────────────────────────────────
// Voltra ERP — domain types
// Mirrors the schema in DESIGN.md (orders → order_items → boms,
// suppliers → components ← bom_lines, production_logs).
// ─────────────────────────────────────────────────────────────

export type Role = "admin" | "supervisor" | "operator" | "viewer";

export type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "IN_PROD"
  | "ON_HOLD"
  | "QC"
  | "QC_FAIL"
  | "PACKING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export type Priority = "low" | "normal" | "high" | "urgent";

export type Station = "reflow" | "solder" | "test" | "assembly";

export type ProductionStatus = "pass" | "fail" | "rework";

export type QueueState = "queued" | "in_progress" | "done";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  email: string;
  /** assigned workstation for operators (limits production actions) */
  station?: Station;
  initials: string;
  accent: string; // css color for avatar
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  country: string;
  leadTimeDays: number;
  rating: number; // 0..5
}

export interface Component {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  packageType: string;
  stockQty: number;
  reservedQty: number;
  minStock: number;
  location: string; // bin / shelf
  unitCost: number; // IDR
  supplierId: string;
  /** optimistic-lock version (DESIGN.md §6) */
  version: number;
  updatedAt: string;
}

export interface BomLine {
  id: string;
  componentId: string;
  designator: string; // e.g. R1, C4, U2
  qtyPerUnit: number;
}

export interface Bom {
  id: string;
  pcbName: string;
  revision: string;
  createdAt: string;
  lines: BomLine[];
}

export interface OrderItem {
  id: string;
  bomId: string;
  quantity: number;
  /** frozen at order-creation time (DESIGN.md §3) */
  unitCost: number;
  notes?: string;
}

export interface Order {
  id: string;
  code: string; // human friendly PO code
  client: string;
  status: OrderStatus;
  priority: Priority;
  dueDate: string;
  createdBy: string; // user id
  createdAt: string;
  notes?: string;
  items: OrderItem[];
  /** denormalized cache of summed item cost (DESIGN.md "Lessons Learned") */
  totalCost: number;
}

export interface StatusLog {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  userId: string;
  notes?: string;
  at: string;
}

export interface ProductionLog {
  id: string;
  orderId: string;
  orderItemId: string;
  station: Station;
  operatorId: string;
  startedAt: string;
  completedAt?: string;
  status: ProductionStatus;
  notes?: string;
}

/** Live card on the production board (derived view). */
export interface QueueCard {
  id: string;
  orderId: string;
  orderCode: string;
  client: string;
  bomName: string;
  revision: string;
  quantity: number;
  priority: Priority;
  dueDate: string;
  station: Station;
  state: QueueState;
  enteredAt: string;
  operatorId?: string;
}

// ── derived / computed shapes used by the UI ──────────────────

export interface BomAvailabilityLine {
  line: BomLine;
  component: Component;
  required: number; // qtyPerUnit * orderQty
  available: number; // stockQty - reservedQty
  sufficient: boolean;
}

export interface OrderBomBreakdown {
  orderItemId: string;
  bom: Bom;
  quantity: number;
  lines: BomAvailabilityLine[];
  shortageCount: number;
  bomUnitCost: number;
}

export interface DashboardStats {
  activeOrders: number;
  ordersDueThisWeek: number;
  unitsCompletedToday: number;
  rejectsToday: number;
  yieldRate: number; // 0..1
  lowStockCount: number;
  onTimeRate: number; // 0..1
  avgLeadTimeDays: number;
  wipUnits: number;
  throughput7d: { day: string; completed: number; reject: number }[];
  stationUtilization: { station: Station; active: number; capacity: number }[];
  statusBreakdown: { status: OrderStatus; count: number }[];
}

export interface ProductionStats {
  perStation: {
    station: Station;
    queued: number;
    inProgress: number;
    completedToday: number;
    yieldRate: number;
    avgCycleMin: number;
  }[];
  hourlyThroughput: { hour: string; units: number }[];
}

export interface ReportDaily {
  date: string;
  unitsCompleted: number;
  unitsReject: number;
  yieldRate: number;
  ordersShipped: number;
  byStation: { station: Station; pass: number; fail: number; rework: number }[];
}

export interface ReportMonthly {
  month: string;
  totalUnits: number;
  yieldRate: number;
  onTimeRate: number;
  avgLeadTimeDays: number;
  revenue: number;
  daily: { day: string; units: number; reject: number }[];
  topClients: { client: string; orders: number; units: number }[];
}

export interface ExportJob {
  id: string;
  kind: "pdf" | "excel";
  scope: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number; // 0..100
  createdAt: string;
  finishedAt?: string;
}

export interface PurchaseRequestLine {
  componentId: string;
  partNumber: string;
  description: string;
  supplierName: string;
  shortBy: number;
  suggestedQty: number;
  unitCost: number;
}

export type Permission =
  | "order.create"
  | "order.edit"
  | "order.status"
  | "inventory.view"
  | "inventory.adjust"
  | "production.scan"
  | "reports.view"
  | "reports.export"
  | "users.manage";
