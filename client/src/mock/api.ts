// ─────────────────────────────────────────────────────────────
// Mock API — an in-browser stand-in for the FastAPI backend.
// Async, latency-simulated, with the real business rules from
// DESIGN.md (FSM transitions, stock reservation, optimistic lock).
// ─────────────────────────────────────────────────────────────
import { parseISO } from "date-fns";
import type {
  Bom,
  BomAvailabilityLine,
  Component,
  DashboardStats,
  ExportJob,
  Order,
  OrderBomBreakdown,
  OrderStatus,
  Priority,
  ProductionLog,
  ProductionStats,
  PurchaseRequestLine,
  ReportDaily,
  ReportMonthly,
  StatusLog,
  Supplier,
  User,
} from "@/types";
import {
  ACTIVE_STATUSES,
  STATION_META,
  STATIONS,
  VALID_TRANSITIONS,
} from "@/lib/domain";
import { bomUnitCost, db, nextId, production30 } from "./seed";
import { advanceCard, getBoard, scanCard } from "./socket";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const delay = (ms = 160 + Math.random() * 220) => new Promise((r) => setTimeout(r, ms));
const todayKey = () => new Date().toISOString().slice(0, 10);
const dayKey = (iso: string) => iso.slice(0, 10);

// ── shared lookups ────────────────────────────────────────────
const compById = (id: string) => db.components.find((c) => c.id === id);
const bomById = (id: string) => db.boms.find((b) => b.id === id);
const userById = (id: string) => db.users.find((u) => u.id === id);
const supplierById = (id: string) => db.suppliers.find((s) => s.id === id);
const logFor = (orderId: string, status: OrderStatus) =>
  db.statusLogs.find((l) => l.orderId === orderId && l.toStatus === status);

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComponentRow extends Component {
  supplierName: string;
  available: number;
  low: boolean;
}
function enrich(c: Component): ComponentRow {
  const available = c.stockQty - c.reservedQty;
  return {
    ...c,
    supplierName: supplierById(c.supplierId)?.name ?? "—",
    available,
    low: available <= c.minStock,
  };
}

export interface OrderRow extends Order {
  createdByName: string;
  itemCount: number;
  totalUnits: number;
}
function enrichOrder(o: Order): OrderRow {
  return {
    ...o,
    createdByName: userById(o.createdBy)?.name ?? "—",
    itemCount: o.items.length,
    totalUnits: o.items.reduce((s, it) => s + it.quantity, 0),
  };
}

function paginate<T>(rows: T[], page: number, pageSize: number): ListResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

function sortRows<T>(rows: T[], sortBy: string | undefined, dir: "asc" | "desc"): T[] {
  if (!sortBy) return rows;
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortBy];
    const bv = (b as Record<string, unknown>)[sortBy];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av ?? "").localeCompare(String(bv ?? "")) * mul;
  });
}

// ── auth ──────────────────────────────────────────────────────
export interface Session {
  token: string;
  user: User;
}

export const authApi = {
  async login(username: string, _password: string): Promise<Session> {
    await delay(320);
    const user = db.users.find((u) => u.username === username.trim().toLowerCase());
    if (!user) throw new ApiError("auth.invalid", "Username atau password salah.");
    // demo backend accepts any non-empty password
    if (!_password) throw new ApiError("auth.invalid", "Password wajib diisi.");
    const token = btoa(`${user.id}:${Date.now()}`);
    return { token, user: clone(user) };
  },
  async me(token: string): Promise<User> {
    await delay(90);
    try {
      const [uid] = atob(token).split(":");
      const user = userById(uid);
      if (user) return clone(user);
    } catch {
      /* fallthrough */
    }
    throw new ApiError("auth.expired", "Sesi berakhir, silakan login ulang.");
  },
};

// ── orders ────────────────────────────────────────────────────
export interface OrderListParams {
  search?: string;
  status?: OrderStatus[];
  priority?: Priority[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  activeOnly?: boolean;
}

export interface OrderDetail {
  order: Order;
  createdBy?: User;
  logs: StatusLog[];
  production: ProductionLog[];
  breakdown: OrderBomBreakdown[];
  nextStatuses: OrderStatus[];
}

function buildBreakdown(order: Order): OrderBomBreakdown[] {
  return order.items.map((item) => {
    const bom = bomById(item.bomId)!;
    const lines: BomAvailabilityLine[] = bom.lines.map((line) => {
      const component = compById(line.componentId)!;
      const required = line.qtyPerUnit * item.quantity;
      const available = component.stockQty - component.reservedQty;
      return { line, component, required, available, sufficient: available >= required };
    });
    return {
      orderItemId: item.id,
      bom,
      quantity: item.quantity,
      lines,
      shortageCount: lines.filter((l) => !l.sufficient).length,
      bomUnitCost: bomUnitCost(bom),
    };
  });
}

export const ordersApi = {
  async list(params: OrderListParams = {}): Promise<ListResult<OrderRow>> {
    await delay();
    const { search, status, priority, activeOnly } = params;
    let rows = db.orders.map(enrichOrder);
    if (activeOnly) rows = rows.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (status?.length) rows = rows.filter((o) => status.includes(o.status));
    if (priority?.length) rows = rows.filter((o) => priority.includes(o.priority));
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.client.toLowerCase().includes(q) ||
          o.createdByName.toLowerCase().includes(q),
      );
    }
    rows = sortRows(rows, params.sortBy ?? "createdAt", params.sortDir ?? "desc");
    return paginate(rows, params.page ?? 1, params.pageSize ?? 10);
  },

  async get(id: string): Promise<OrderDetail> {
    await delay();
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new ApiError("order.notfound", "Order tidak ditemukan.");
    return {
      order: clone(order),
      createdBy: clone(userById(order.createdBy)),
      logs: clone(
        db.statusLogs
          .filter((l) => l.orderId === id)
          .sort((a, b) => +parseISO(a.at) - +parseISO(b.at)),
      ),
      production: clone(
        db.productionLogs
          .filter((l) => l.orderId === id)
          .sort((a, b) => +parseISO(a.startedAt) - +parseISO(b.startedAt)),
      ),
      breakdown: clone(buildBreakdown(order)),
      nextStatuses: VALID_TRANSITIONS[order.status],
    };
  },

  async create(payload: {
    client: string;
    priority: Priority;
    dueDate: string;
    notes?: string;
    createdBy: string;
    items: { bomId: string; quantity: number }[];
  }): Promise<Order> {
    await delay(280);
    if (!payload.client.trim()) throw new ApiError("order.invalid", "Nama client wajib diisi.");
    if (!payload.items.length) throw new ApiError("order.invalid", "Order minimal 1 item.");
    const id = nextId("ord");
    const seq = 300 + db.orders.length;
    const items = payload.items.map((it, i) => {
      const bom = bomById(it.bomId);
      if (!bom) throw new ApiError("order.invalid", "BOM tidak valid.");
      if (it.quantity <= 0) throw new ApiError("order.invalid", "Quantity harus > 0.");
      return {
        id: `${id}-i${i}`,
        bomId: it.bomId,
        quantity: it.quantity,
        unitCost: Math.round(bomUnitCost(bom) * 1.4),
      };
    });
    const order: Order = {
      id,
      code: `PO-2026-${String(seq).padStart(4, "0")}`,
      client: payload.client.trim(),
      status: "DRAFT",
      priority: payload.priority,
      dueDate: payload.dueDate,
      createdBy: payload.createdBy,
      createdAt: new Date().toISOString(),
      notes: payload.notes?.trim() || undefined,
      items,
      totalCost: items.reduce((s, it) => s + it.unitCost * it.quantity, 0),
    };
    db.orders.unshift(order);
    db.statusLogs.push({
      id: nextId("slog"),
      orderId: id,
      fromStatus: null,
      toStatus: "DRAFT",
      userId: payload.createdBy,
      notes: "Order dibuat.",
      at: order.createdAt,
    });
    return clone(order);
  },

  async updateStatus(
    id: string,
    to: OrderStatus,
    userId: string,
    notes?: string,
  ): Promise<{ order: Order; log: StatusLog }> {
    await delay(260);
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new ApiError("order.notfound", "Order tidak ditemukan.");
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(to)) {
      throw new ApiError(
        "order.transition",
        `Tidak bisa pindah dari ${order.status} ke ${to}. Valid: ${allowed.join(", ") || "—"}`,
      );
    }
    const from = order.status;
    order.status = to;

    // side-effects on component stock (DESIGN.md §4)
    if (to === "CONFIRMED") reserveStock(order, +1);
    else if (to === "CANCELLED" && from !== "DRAFT") reserveStock(order, -1);
    else if (to === "SHIPPED") deductFinal(order);

    const log: StatusLog = {
      id: nextId("slog"),
      orderId: id,
      fromStatus: from,
      toStatus: to,
      userId,
      notes: notes?.trim() || undefined,
      at: new Date().toISOString(),
    };
    db.statusLogs.push(log);
    return { order: clone(order), log: clone(log) };
  },
};

function reserveStock(order: Order, sign: number) {
  for (const item of order.items) {
    const bom = bomById(item.bomId);
    if (!bom) continue;
    for (const line of bom.lines) {
      const comp = compById(line.componentId);
      if (!comp) continue;
      const need = line.qtyPerUnit * item.quantity * sign;
      comp.reservedQty = Math.max(0, Math.min(comp.stockQty, comp.reservedQty + need));
    }
  }
}
function deductFinal(order: Order) {
  for (const item of order.items) {
    const bom = bomById(item.bomId);
    if (!bom) continue;
    for (const line of bom.lines) {
      const comp = compById(line.componentId);
      if (!comp) continue;
      const need = line.qtyPerUnit * item.quantity;
      comp.stockQty = Math.max(0, comp.stockQty - need);
      comp.reservedQty = Math.max(0, comp.reservedQty - need);
      comp.version += 1;
      comp.updatedAt = new Date().toISOString();
    }
  }
}

// ── inventory ─────────────────────────────────────────────────
export interface InventoryListParams {
  search?: string;
  category?: string[];
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const inventoryApi = {
  async list(params: InventoryListParams = {}): Promise<ListResult<ComponentRow>> {
    await delay();
    let rows = db.components.map(enrich);
    if (params.category?.length) rows = rows.filter((c) => params.category!.includes(c.category));
    if (params.lowStockOnly) rows = rows.filter((c) => c.low);
    if (params.search?.trim()) {
      // mock of the pg_trgm fuzzy search — normalised substring match
      const q = params.search.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          c.partNumber.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q),
      );
    }
    rows = sortRows(rows, params.sortBy ?? "partNumber", params.sortDir ?? "asc");
    return paginate(rows, params.page ?? 1, params.pageSize ?? 12);
  },

  async categories(): Promise<string[]> {
    await delay(60);
    return [...new Set(db.components.map((c) => c.category))].sort();
  },

  async summary(): Promise<{ total: number; lowStock: number; totalValue: number; categories: number }> {
    await delay(110);
    const rows = db.components.map(enrich);
    return {
      total: rows.length,
      lowStock: rows.filter((c) => c.low).length,
      totalValue: rows.reduce((s, c) => s + c.stockQty * c.unitCost, 0),
      categories: new Set(rows.map((c) => c.category)).size,
    };
  },

  async get(id: string): Promise<{ component: ComponentRow; supplier?: Supplier; usedIn: Bom[] }> {
    await delay();
    const comp = compById(id);
    if (!comp) throw new ApiError("inv.notfound", "Komponen tidak ditemukan.");
    const usedIn = db.boms.filter((b) => b.lines.some((l) => l.componentId === id));
    return {
      component: enrich(clone(comp)),
      supplier: clone(supplierById(comp.supplierId)),
      usedIn: clone(usedIn),
    };
  },

  async adjust(id: string, delta: number, expectedVersion?: number): Promise<ComponentRow> {
    await delay(220);
    const comp = compById(id);
    if (!comp) throw new ApiError("inv.notfound", "Komponen tidak ditemukan.");
    // optimistic lock (DESIGN.md §6)
    if (expectedVersion != null && expectedVersion !== comp.version) {
      throw new ApiError("inv.concurrent", "Stok baru saja diupdate orang lain, coba lagi.");
    }
    const next = comp.stockQty + delta;
    if (next < 0) {
      throw new ApiError("inv.insufficient", `Stok tidak cukup. Tersedia ${comp.stockQty}.`);
    }
    comp.stockQty = next;
    comp.version += 1;
    comp.updatedAt = new Date().toISOString();
    return enrich(clone(comp));
  },

  async alerts(): Promise<{ rows: ComponentRow[]; purchaseRequest: PurchaseRequestLine[] }> {
    await delay();
    const rows = db.components.map(enrich).filter((c) => c.low).sort((a, b) => a.available - b.available);
    const purchaseRequest: PurchaseRequestLine[] = rows.map((c) => {
      const shortBy = Math.max(0, c.minStock - c.available);
      return {
        componentId: c.id,
        partNumber: c.partNumber,
        description: c.description,
        supplierName: c.supplierName,
        shortBy,
        suggestedQty: Math.max(c.minStock * 2 - c.available, c.minStock),
        unitCost: c.unitCost,
      };
    });
    return { rows: clone(rows), purchaseRequest };
  },
};

// ── suppliers ─────────────────────────────────────────────────
export const suppliersApi = {
  async list(): Promise<(Supplier & { componentCount: number })[]> {
    await delay(120);
    return db.suppliers.map((s) => ({
      ...clone(s),
      componentCount: db.components.filter((c) => c.supplierId === s.id).length,
    }));
  },
};

// ── boms ──────────────────────────────────────────────────────
export const bomsApi = {
  async list(): Promise<(Bom & { unitCost: number; lineCount: number })[]> {
    await delay(120);
    return db.boms.map((b) => ({ ...clone(b), unitCost: bomUnitCost(b), lineCount: b.lines.length }));
  },
};

// ── production ────────────────────────────────────────────────
export const productionApi = {
  board: getBoard,
  scan: scanCard,
  advance: advanceCard,

  async stats(): Promise<ProductionStats> {
    await delay(140);
    const today = production30[production30.length - 1];
    const board = getBoard();
    const perStation = STATIONS.map((station) => {
      const cards = board.filter((c) => c.station === station);
      const st = today.byStation[station];
      const total = st.pass + st.fail;
      return {
        station,
        queued: cards.filter((c) => c.state === "queued").length,
        inProgress: cards.filter((c) => c.state === "in_progress").length,
        completedToday: st.pass,
        yieldRate: total ? st.pass / total : 1,
        avgCycleMin: 40 + STATIONS.indexOf(station) * 12,
      };
    });
    // distribute today's completed across an 08:00–16:00 curve
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16];
    const curve = [0.6, 1, 1.1, 1.2, 0.5, 0.9, 1.2, 1.1, 0.7];
    const sum = curve.reduce((a, b) => a + b, 0);
    const hourlyThroughput = hours.map((h, i) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      units: Math.round((today.completed * curve[i]) / sum),
    }));
    return { perStation, hourlyThroughput };
  },
};

// ── reports / dashboard ───────────────────────────────────────
function shippedOnTime(order: Order): boolean | null {
  const shipped = logFor(order.id, "SHIPPED");
  if (!shipped) return null;
  return parseISO(shipped.at) <= parseISO(order.dueDate);
}

export const reportsApi = {
  async dashboard(): Promise<DashboardStats> {
    await delay(180);
    const active = db.orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const weekMs = 7 * 86_400_000;
    const dueThisWeek = active.filter((o) => {
      const d = +parseISO(o.dueDate) - Date.now();
      return d >= 0 && d <= weekMs;
    }).length;

    const today = production30[production30.length - 1];
    const yieldRate = today.completed + today.reject ? today.completed / (today.completed + today.reject) : 1;

    const shippedOrders = db.orders.filter((o) => shippedOnTime(o) !== null);
    const onTime = shippedOrders.filter((o) => shippedOnTime(o) === true).length;
    const onTimeRate = shippedOrders.length ? onTime / shippedOrders.length : 1;

    const completed = db.orders.filter((o) => o.status === "COMPLETED");
    const leadTimes = completed
      .map((o) => {
        const done = logFor(o.id, "COMPLETED");
        return done ? (+parseISO(done.at) - +parseISO(o.createdAt)) / 86_400_000 : null;
      })
      .filter((v): v is number => v != null);
    const avgLeadTimeDays = leadTimes.length
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

    const wipUnits = db.orders
      .filter((o) => ["IN_PROD", "QC", "QC_FAIL", "PACKING"].includes(o.status))
      .reduce((s, o) => s + o.items.reduce((a, it) => a + it.quantity, 0), 0);

    const lowStockCount = db.components.map(enrich).filter((c) => c.low).length;

    const throughput7d = production30.slice(-7).map((d) => ({
      day: new Date(d.date).toLocaleDateString("id-ID", { weekday: "short" }),
      completed: d.completed,
      reject: d.reject,
    }));

    const board = getBoard();
    const stationUtilization = STATIONS.map((station) => ({
      station,
      active: board.filter((c) => c.station === station && c.state === "in_progress").length,
      capacity: STATION_META[station].capacity,
    }));

    const statusBreakdown = ACTIVE_STATUSES.map((status) => ({
      status,
      count: db.orders.filter((o) => o.status === status).length,
    })).filter((s) => s.count > 0);

    return {
      activeOrders: active.length,
      ordersDueThisWeek: dueThisWeek,
      unitsCompletedToday: today.completed,
      rejectsToday: today.reject,
      yieldRate,
      lowStockCount,
      onTimeRate,
      avgLeadTimeDays,
      wipUnits,
      throughput7d,
      stationUtilization,
      statusBreakdown,
    };
  },

  async daily(dateIso?: string): Promise<ReportDaily> {
    await delay(160);
    const key = dateIso ? dayKey(dateIso) : todayKey();
    const day = production30.find((d) => dayKey(d.date) === key) ?? production30[production30.length - 1];
    const ordersShipped = db.orders.filter((o) => {
      const s = logFor(o.id, "SHIPPED");
      return s && dayKey(s.at) === key;
    }).length;
    return {
      date: day.date,
      unitsCompleted: day.completed,
      unitsReject: day.reject,
      yieldRate: day.completed + day.reject ? day.completed / (day.completed + day.reject) : 1,
      ordersShipped,
      byStation: STATIONS.map((station) => ({ station, ...day.byStation[station] })),
    };
  },

  async monthly(): Promise<ReportMonthly> {
    await delay(220);
    const totalUnits = production30.reduce((s, d) => s + d.completed, 0);
    const totalReject = production30.reduce((s, d) => s + d.reject, 0);
    const yieldRate = totalUnits + totalReject ? totalUnits / (totalUnits + totalReject) : 1;

    const shippedOrders = db.orders.filter((o) => shippedOnTime(o) !== null);
    const onTime = shippedOrders.filter((o) => shippedOnTime(o) === true).length;
    const onTimeRate = shippedOrders.length ? onTime / shippedOrders.length : 1;

    const completed = db.orders.filter((o) => o.status === "COMPLETED");
    const leadTimes = completed
      .map((o) => {
        const done = logFor(o.id, "COMPLETED");
        return done ? (+parseISO(done.at) - +parseISO(o.createdAt)) / 86_400_000 : null;
      })
      .filter((v): v is number => v != null);
    const avgLeadTimeDays = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    const revenue = db.orders
      .filter((o) => o.status === "COMPLETED" || o.status === "SHIPPED")
      .reduce((s, o) => s + o.totalCost, 0);

    const clientMap = new Map<string, { orders: number; units: number }>();
    for (const o of db.orders) {
      const entry = clientMap.get(o.client) ?? { orders: 0, units: 0 };
      entry.orders += 1;
      entry.units += o.items.reduce((a, it) => a + it.quantity, 0);
      clientMap.set(o.client, entry);
    }
    const topClients = [...clientMap.entries()]
      .map(([client, v]) => ({ client, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return {
      month: new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      totalUnits,
      yieldRate,
      onTimeRate,
      avgLeadTimeDays,
      revenue,
      daily: production30.map((d) => ({
        day: new Date(d.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        units: d.completed,
        reject: d.reject,
      })),
      topClients,
    };
  },
};

// ── async export jobs (Celery stand-in) ───────────────────────
const exportJobs = new Map<string, ExportJob>();

export const exportApi = {
  async create(kind: "pdf" | "excel", scope: string): Promise<ExportJob> {
    await delay(120);
    const job: ExportJob = {
      id: nextId("job"),
      kind,
      scope,
      status: "queued",
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    exportJobs.set(job.id, job);
    // simulate Celery worker progress
    const iv = setInterval(() => {
      const j = exportJobs.get(job.id);
      if (!j) return clearInterval(iv);
      if (j.status === "queued") j.status = "processing";
      j.progress = Math.min(100, j.progress + 12 + Math.random() * 16);
      if (j.progress >= 100) {
        j.progress = 100;
        j.status = "done";
        j.finishedAt = new Date().toISOString();
        clearInterval(iv);
      }
    }, 420);
    return clone(job);
  },
  async get(id: string): Promise<ExportJob> {
    await delay(60);
    const job = exportJobs.get(id);
    if (!job) throw new ApiError("export.notfound", "Job tidak ditemukan.");
    return clone(job);
  },
};

// ── users (admin) ─────────────────────────────────────────────
export const usersApi = {
  async list(): Promise<User[]> {
    await delay(120);
    return clone(db.users);
  },
};

export const api = {
  auth: authApi,
  orders: ordersApi,
  inventory: inventoryApi,
  suppliers: suppliersApi,
  boms: bomsApi,
  production: productionApi,
  reports: reportsApi,
  export: exportApi,
  users: usersApi,
};
