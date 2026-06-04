import { addDays, formatISO, startOfDay, subDays } from "date-fns";
import type {
  Bom,
  BomLine,
  Component,
  Order,
  OrderItem,
  OrderStatus,
  ProductionLog,
  ProductionStatus,
  QueueCard,
  Station,
  StatusLog,
  Supplier,
  User,
} from "@/types";
import { PRIORITIES, STATIONS } from "@/lib/domain";
import { createRng } from "./rng";

const rng = createRng(0x20260605);
const now = new Date();

const iso = (d: Date) => formatISO(d);
const daysAgo = (n: number) => subDays(now, n);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

// ── users ─────────────────────────────────────────────────────
export const users: User[] = [
  { id: "usr-admin", name: "Rangga Pratama", username: "rangga", role: "admin", email: "rangga@voltra.id", initials: "RP", accent: "#E8A33D" },
  { id: "usr-spv", name: "Sari Wulandari", username: "sari", role: "supervisor", email: "sari@voltra.id", initials: "SW", accent: "#3FD0CE" },
  { id: "usr-op1", name: "Budi Santoso", username: "budi", role: "operator", email: "budi@voltra.id", station: "solder", initials: "BS", accent: "#4FBE7E" },
  { id: "usr-op2", name: "Dewi Lestari", username: "dewi", role: "operator", email: "dewi@voltra.id", station: "test", initials: "DL", accent: "#9B8CFA" },
  { id: "usr-op3", name: "Agus Riyanto", username: "agus", role: "operator", email: "agus@voltra.id", station: "reflow", initials: "AR", accent: "#F0605D" },
  { id: "usr-view", name: "Maya Hartono", username: "maya", role: "viewer", email: "maya@voltra.id", initials: "MH", accent: "#5B9BD5" },
];
const operators = users.filter((u) => u.role === "operator");
const managers = users.filter((u) => u.role === "admin" || u.role === "supervisor");

// ── suppliers ─────────────────────────────────────────────────
export const suppliers: Supplier[] = [
  { id: "sup-lcsc", name: "LCSC Electronics", contact: "sales@lcsc.com", country: "China", leadTimeDays: 12, rating: 4.4 },
  { id: "sup-mouser", name: "Mouser Electronics", contact: "id@mouser.com", country: "USA", leadTimeDays: 18, rating: 4.8 },
  { id: "sup-digi", name: "Digi-Key", contact: "apac@digikey.com", country: "USA", leadTimeDays: 16, rating: 4.9 },
  { id: "sup-gold", name: "Shenzhen Goldtech", contact: "info@goldtech.cn", country: "China", leadTimeDays: 20, rating: 3.9 },
  { id: "sup-thai", name: "Thai Components Co.", contact: "order@thaicomp.co.th", country: "Thailand", leadTimeDays: 14, rating: 4.1 },
  { id: "sup-glodok", name: "Glodok Elektronik", contact: "wa: 0812-xxxx", country: "Indonesia", leadTimeDays: 3, rating: 3.6 },
];

const SUPPLIER_BY_CATEGORY: Record<string, string[]> = {
  Resistor: ["sup-lcsc", "sup-glodok"],
  Capacitor: ["sup-lcsc", "sup-glodok"],
  LED: ["sup-lcsc", "sup-glodok"],
  Diode: ["sup-lcsc", "sup-glodok"],
  Transistor: ["sup-lcsc", "sup-glodok"],
  IC: ["sup-lcsc", "sup-mouser", "sup-digi"],
  Memory: ["sup-lcsc", "sup-mouser"],
  Regulator: ["sup-lcsc", "sup-mouser", "sup-digi"],
  Module: ["sup-lcsc", "sup-mouser", "sup-digi", "sup-gold"],
  Sensor: ["sup-lcsc", "sup-mouser", "sup-digi"],
  MOSFET: ["sup-lcsc", "sup-thai"],
  Connector: ["sup-gold", "sup-glodok"],
  Switch: ["sup-gold", "sup-glodok"],
  Crystal: ["sup-lcsc", "sup-thai"],
  Inductor: ["sup-lcsc", "sup-thai"],
  PCB: ["sup-gold"],
};

// ── components ────────────────────────────────────────────────
// [partNumber, description, category, package, baseCost(IDR)]
type PartTpl = [string, string, string, string, number];
const NAMED_PARTS: PartTpl[] = [
  ["STM32F103C8T6", "MCU ARM Cortex-M3 72MHz 64KB", "IC", "LQFP-48", 38000],
  ["ESP32-WROOM-32E", "WiFi+BT SoC module 4MB flash", "Module", "SMD-38", 42000],
  ["ATmega328P-AU", "MCU AVR 8-bit 32KB", "IC", "TQFP-32", 28000],
  ["RP2040", "Dual Cortex-M0+ 133MHz", "IC", "QFN-56", 16500],
  ["CH340C", "USB-to-UART bridge", "IC", "SOP-16", 6500],
  ["AMS1117-3.3", "LDO regulator 3.3V 1A", "Regulator", "SOT-223", 1800],
  ["MP1584EN", "Buck converter 3A", "Regulator", "SOT23-6", 4200],
  ["NE555", "Precision timer", "IC", "SOIC-8", 1500],
  ["LM358", "Dual op-amp", "IC", "SOIC-8", 1700],
  ["TP4056", "Li-ion charger 1A", "IC", "SOP-8", 2200],
  ["ULN2003A", "Darlington array 7ch", "IC", "SOIC-16", 3200],
  ["74HC595", "8-bit shift register", "IC", "SOIC-16", 2400],
  ["MCP2515", "CAN controller SPI", "IC", "SOIC-18", 18500],
  ["DS3231SN", "RTC ±2ppm TCXO", "IC", "SOIC-16", 24000],
  ["W25Q128JV", "SPI flash 128Mbit", "Memory", "SOIC-8", 13500],
  ["AO3400", "N-MOSFET 30V 5.7A", "MOSFET", "SOT-23", 900],
  ["IRLZ44N", "N-MOSFET 55V 47A", "MOSFET", "TO-220", 6800],
  ["BSS138", "N-MOSFET logic-level", "MOSFET", "SOT-23", 650],
  ["SS34", "Schottky diode 40V 3A", "Diode", "SMA", 700],
  ["1N4148WS", "Switching diode 100V", "Diode", "SOD-323", 250],
  ["S8050", "NPN transistor 40V", "Transistor", "SOT-23", 300],
  ["Y-8MHZ-49S", "Crystal 8MHz 20pF", "Crystal", "HC-49S", 1900],
  ["Y-16MHZ-3225", "Crystal 16MHz SMD", "Crystal", "SMD-3225", 2100],
  ["IND-10UH-3A", "Power inductor 10µH 3A", "Inductor", "SMD-1265", 1600],
  ["FB-600R-0805", "Ferrite bead 600Ω", "Inductor", "0805", 220],
  ["USB-C-16P", "USB Type-C receptacle 16P", "Connector", "SMD", 3800],
  ["MICRO-USB-B", "Micro USB type-B", "Connector", "SMD", 1400],
  ["JST-XH-2P", "JST XH 2-pin 2.5mm", "Connector", "TH", 600],
  ["JST-PH-4P", "JST PH 4-pin 2.0mm", "Connector", "TH", 900],
  ["HDR-2X20", "Pin header 2.54mm 2x20", "Connector", "TH", 2500],
  ["TERM-5.08-2P", "Screw terminal 5.08mm 2P", "Connector", "TH", 1500],
  ["SW-TACT-6X6", "Tactile button 6x6mm", "Switch", "SMD", 350],
  ["SW-SPDT-SMD", "Slide switch SPDT", "Switch", "SMD", 800],
  ["LED-G-0805", "LED green 0805 20mA", "LED", "0805", 180],
  ["LED-R-0805", "LED red 0805 20mA", "LED", "0805", 180],
  ["WS2812B", "Addressable RGB LED", "LED", "5050", 1300],
  ["DHT22", "Temp/Humidity sensor", "Sensor", "Module", 28000],
  ["MPU6050", "6-axis IMU gyro+accel", "Sensor", "QFN-24", 14500],
  ["BME280", "Pressure/Temp/Humidity", "Sensor", "LGA-8", 32000],
  ["PCB-2L-FR4", "PCB 2-layer FR4 1.6mm HASL", "PCB", "Panel", 18000],
];
const RES_VALUES = ["220R", "330R", "1k", "4.7k", "10k", "100k"];
const CAP_VALUES: [string, string, number][] = [
  ["100nF", "Capacitor 100nF X7R", 110],
  ["1µF", "Capacitor 1µF X7R", 160],
  ["10µF", "Capacitor 10µF X5R", 280],
  ["22µF", "Capacitor 22µF X5R", 420],
  ["22pF", "Capacitor 22pF C0G", 120],
];

const PARTS: PartTpl[] = [
  ...NAMED_PARTS,
  ...RES_VALUES.map<PartTpl>((v) => [`R-${v}-0805`, `Resistor ${v} 1% 1/8W`, "Resistor", "0805", 80]),
  ...CAP_VALUES.map<PartTpl>(([v, d, c]) => [`C-${v}-0805`, d, "Capacitor", "0805", c]),
];

// parts forced to be below minimum (drives the Low-Stock alerts)
const LOW_STOCK = new Set([
  "STM32F103C8T6",
  "USB-C-16P",
  "DS3231SN",
  "MPU6050",
  "Y-16MHZ-3225",
  "AO3400",
  "LED-G-0805",
  "BME280",
]);

function minStockFor(cost: number): number {
  if (cost < 500) return rng.int(8, 12) * 100; // passives: 800–1200
  if (cost < 5000) return rng.int(60, 180);
  return rng.int(18, 40);
}

const BIN_ROWS = ["A", "B", "C", "D", "E"];

export const components: Component[] = PARTS.map(([pn, desc, cat, pkg, baseCost], i) => {
  const min = minStockFor(baseCost);
  const low = LOW_STOCK.has(pn);
  const stockQty = low
    ? rng.int(0, Math.floor(min * 0.6))
    : Math.floor(min * rng.float(1.8, 6));
  const reservedQty = Math.min(stockQty, Math.floor(stockQty * rng.float(0, 0.18)));
  const supplierPool = SUPPLIER_BY_CATEGORY[cat] ?? ["sup-lcsc"];
  return {
    id: `cmp-${String(i + 1).padStart(3, "0")}`,
    partNumber: pn,
    description: desc,
    category: cat,
    packageType: pkg,
    stockQty,
    reservedQty,
    minStock: min,
    location: `${rng.pick(BIN_ROWS)}${rng.int(1, 6)}-${String(rng.int(1, 28)).padStart(2, "0")}`,
    unitCost: Math.round((baseCost * rng.float(0.97, 1.06)) / 10) * 10,
    supplierId: rng.pick(supplierPool),
    version: rng.int(1, 14),
    updatedAt: iso(hoursAgo(rng.int(1, 22 * 24))),
  };
});

const byCategory = (cat: string) => components.filter((c) => c.category === cat);
const compById = (id: string) => components.find((c) => c.id === id)!;

// ── BOMs ──────────────────────────────────────────────────────
const DESIGNATOR_PREFIX: Record<string, string> = {
  Resistor: "R", Capacitor: "C", IC: "U", Memory: "U", Regulator: "U",
  Module: "U", Sensor: "U", MOSFET: "Q", Transistor: "Q", Diode: "D",
  LED: "D", Connector: "J", Switch: "SW", Crystal: "Y", Inductor: "L",
};
const QTY_RANGE: Record<string, [number, number]> = {
  Resistor: [1, 8], Capacitor: [1, 10], LED: [1, 4], Diode: [1, 3],
  Connector: [1, 2], default: [1, 1],
};

interface Recipe { cat: string; n: number }
function buildBom(id: string, pcbName: string, revision: string, daysOld: number, recipe: Recipe[]): Bom {
  const counters: Record<string, number> = {};
  const lines: BomLine[] = [];
  let li = 0;
  for (const { cat, n } of recipe) {
    const picks = rng.sample(byCategory(cat), n);
    for (const comp of picks) {
      const prefix = DESIGNATOR_PREFIX[cat] ?? "X";
      counters[prefix] = (counters[prefix] ?? 0) + 1;
      const [lo, hi] = QTY_RANGE[cat] ?? QTY_RANGE.default;
      lines.push({
        id: `bl-${id}-${li++}`,
        componentId: comp.id,
        designator: `${prefix}${counters[prefix]}`,
        qtyPerUnit: rng.int(lo, hi),
      });
    }
  }
  return { id, pcbName, revision, createdAt: iso(daysAgo(daysOld)), lines };
}

const BOM_DEFS: [string, string, number, Recipe[]][] = [
  ["Voltra IoT Gateway", "C", 210, [
    { cat: "IC", n: 1 }, { cat: "Module", n: 1 }, { cat: "Regulator", n: 1 },
    { cat: "Resistor", n: 5 }, { cat: "Capacitor", n: 6 }, { cat: "Connector", n: 2 },
    { cat: "LED", n: 2 }, { cat: "Crystal", n: 1 },
  ]],
  ["PowerSense Energy Meter", "B", 160, [
    { cat: "IC", n: 2 }, { cat: "Regulator", n: 1 }, { cat: "Resistor", n: 6 },
    { cat: "Capacitor", n: 5 }, { cat: "MOSFET", n: 1 }, { cat: "Connector", n: 2 }, { cat: "Diode", n: 1 },
  ]],
  ["MotorDrive Controller", "A", 95, [
    { cat: "IC", n: 1 }, { cat: "MOSFET", n: 4 }, { cat: "Regulator", n: 1 },
    { cat: "Resistor", n: 4 }, { cat: "Capacitor", n: 4 }, { cat: "Connector", n: 3 }, { cat: "Diode", n: 2 },
  ]],
  ["AgriSense Soil Node", "D", 240, [
    { cat: "IC", n: 1 }, { cat: "Sensor", n: 1 }, { cat: "Regulator", n: 1 },
    { cat: "Resistor", n: 4 }, { cat: "Capacitor", n: 4 }, { cat: "Connector", n: 2 }, { cat: "LED", n: 1 },
  ]],
  ["SmartRelay 4CH", "B", 130, [
    { cat: "IC", n: 1 }, { cat: "Transistor", n: 4 }, { cat: "Resistor", n: 5 },
    { cat: "Capacitor", n: 3 }, { cat: "Diode", n: 4 }, { cat: "Connector", n: 2 }, { cat: "LED", n: 4 },
  ]],
  ["BLDC ESC 30A", "A", 70, [
    { cat: "IC", n: 1 }, { cat: "MOSFET", n: 6 }, { cat: "Regulator", n: 1 },
    { cat: "Resistor", n: 6 }, { cat: "Capacitor", n: 5 }, { cat: "Connector", n: 2 },
  ]],
  ["EnviroLogger Pro", "C", 185, [
    { cat: "IC", n: 1 }, { cat: "Sensor", n: 2 }, { cat: "Memory", n: 1 }, { cat: "Regulator", n: 1 },
    { cat: "Resistor", n: 4 }, { cat: "Capacitor", n: 5 }, { cat: "Connector", n: 2 },
  ]],
  ["LED Matrix Driver 8x8", "A", 60, [
    { cat: "IC", n: 2 }, { cat: "LED", n: 3 }, { cat: "Resistor", n: 4 },
    { cat: "Capacitor", n: 3 }, { cat: "Connector", n: 2 },
  ]],
  ["USB-C PD Trigger", "B", 110, [
    { cat: "IC", n: 1 }, { cat: "MOSFET", n: 1 }, { cat: "Resistor", n: 4 },
    { cat: "Capacitor", n: 3 }, { cat: "Connector", n: 2 }, { cat: "LED", n: 1 },
  ]],
  ["CAN Bus Sniffer", "A", 80, [
    { cat: "IC", n: 2 }, { cat: "Regulator", n: 1 }, { cat: "Resistor", n: 3 },
    { cat: "Capacitor", n: 4 }, { cat: "Connector", n: 2 }, { cat: "Crystal", n: 1 }, { cat: "LED", n: 1 },
  ]],
];

export const boms: Bom[] = BOM_DEFS.map(([name, rev, age, recipe], i) =>
  buildBom(`bom-${String(i + 1).padStart(2, "0")}`, name, rev, age, recipe),
);

export function bomUnitCost(bom: Bom): number {
  return bom.lines.reduce((sum, l) => sum + l.qtyPerUnit * compById(l.componentId).unitCost, 0);
}

// ── orders ────────────────────────────────────────────────────
const CLIENTS = [
  "PT Sinar Elektronik", "CV Maju Teknik", "Robotika Nusantara", "PT Energi Surya Mandiri",
  "Politeknik Negeri Bandung", "PT Agri Sensor Indonesia", "Quadcopter Labs", "PT Otomasi Cerdas",
  "Bengkel IoT Jaya", "PT Medika Devices", "Universitas Telkom", "CV Lampu Pintar",
];

// status → [createdDaysAgo range, dueOffset range from now]
const STATUS_TIMING: Record<OrderStatus, { age: [number, number]; due: [number, number] }> = {
  DRAFT: { age: [0, 3], due: [7, 24] },
  CONFIRMED: { age: [2, 7], due: [5, 18] },
  IN_PROD: { age: [4, 13], due: [-3, 12] },
  ON_HOLD: { age: [6, 15], due: [-4, 9] },
  QC: { age: [8, 17], due: [-2, 8] },
  QC_FAIL: { age: [9, 17], due: [-3, 6] },
  PACKING: { age: [10, 19], due: [-1, 5] },
  SHIPPED: { age: [14, 24], due: [-12, -1] },
  COMPLETED: { age: [18, 44], due: [-30, -4] },
  CANCELLED: { age: [6, 30], due: [-20, 6] },
};

const STATUS_PLAN: OrderStatus[] = [
  "DRAFT", "DRAFT",
  "CONFIRMED", "CONFIRMED", "CONFIRMED",
  "IN_PROD", "IN_PROD", "IN_PROD", "IN_PROD",
  "ON_HOLD",
  "QC", "QC",
  "QC_FAIL",
  "PACKING", "PACKING",
  "SHIPPED", "SHIPPED",
  "COMPLETED", "COMPLETED", "COMPLETED",
  "CANCELLED", "CANCELLED",
];

// canonical FSM path used to synthesise status history
const PATHS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["DRAFT"],
  CONFIRMED: ["DRAFT", "CONFIRMED"],
  IN_PROD: ["DRAFT", "CONFIRMED", "IN_PROD"],
  ON_HOLD: ["DRAFT", "CONFIRMED", "ON_HOLD"],
  QC: ["DRAFT", "CONFIRMED", "IN_PROD", "QC"],
  QC_FAIL: ["DRAFT", "CONFIRMED", "IN_PROD", "QC", "QC_FAIL"],
  PACKING: ["DRAFT", "CONFIRMED", "IN_PROD", "QC", "PACKING"],
  SHIPPED: ["DRAFT", "CONFIRMED", "IN_PROD", "QC", "PACKING", "SHIPPED"],
  COMPLETED: ["DRAFT", "CONFIRMED", "IN_PROD", "QC", "PACKING", "SHIPPED", "COMPLETED"],
  CANCELLED: ["DRAFT", "CONFIRMED", "CANCELLED"],
};

const TRANSITION_NOTE: Partial<Record<OrderStatus, string[]>> = {
  CONFIRMED: ["Stok komplit, lanjut produksi.", "BOM divalidasi, stok di-reserve.", ""],
  IN_PROD: ["Masuk antrian reflow.", "Mulai SMT line.", ""],
  ON_HOLD: ["Nunggu STM32F103 dari LCSC.", "Komponen USB-C kurang, PR dikirim.", "Tahan dulu, konfirmasi revisi BOM."],
  QC: ["Selesai assembly, masuk QC.", "Functional test batch.", ""],
  QC_FAIL: ["2 unit gagal functional test, rework.", "Cold joint pin U1, balik solder."],
  PACKING: ["Lolos QC 100%, packing.", "QC pass, siap kemas.", ""],
  SHIPPED: ["Dikirim via JNE.", "Pickup oleh kurir client.", ""],
  COMPLETED: ["Diterima client, closed.", "Invoice lunas, order selesai."],
  CANCELLED: ["Dibatalkan client.", "Budget client di-hold, cancel.", "Duplikat order, dibatalkan."],
};

export const orders: Order[] = [];
export const statusLogs: StatusLog[] = [];
export const productionLogs: ProductionLog[] = [];

let poSeq = 118;
STATUS_PLAN.forEach((status, idx) => {
  const timing = STATUS_TIMING[status];
  const ageDays = rng.int(timing.age[0], timing.age[1]);
  const createdAt = daysAgo(ageDays);
  const dueDate = startOfDay(addDays(now, rng.int(timing.due[0], timing.due[1])));
  const itemCount = rng.chance(0.35) ? 2 : 1;
  const items: OrderItem[] = [];
  let totalCost = 0;
  for (let k = 0; k < itemCount; k++) {
    const bom = rng.pick(boms);
    const quantity = rng.pick([10, 15, 20, 25, 30, 40, 50, 60, 80, 100]);
    const unitCost = Math.round(bomUnitCost(bom) * rng.float(1.28, 1.55)); // +margin, frozen
    items.push({ id: `oi-${idx}-${k}`, bomId: bom.id, quantity, unitCost, notes: undefined });
    totalCost += unitCost * quantity;
  }
  const order: Order = {
    id: `ord-${String(idx + 1).padStart(3, "0")}`,
    code: `PO-2026-${String(++poSeq).padStart(4, "0")}`,
    client: rng.pick(CLIENTS),
    status,
    priority: rng.pick(
      // weight toward normal
      [...PRIORITIES, "normal", "normal", "high", "low"] as typeof PRIORITIES,
    ),
    dueDate: iso(dueDate),
    createdBy: rng.pick(managers).id,
    createdAt: iso(createdAt),
    notes: rng.chance(0.4) ? rng.pick(["Mohon prioritas, client repeat.", "Cek revisi BOM terbaru.", "Packaging anti-static wajib."]) : undefined,
    items,
    totalCost,
  };
  orders.push(order);

  // ── status history along the canonical path ──
  const path = PATHS[status];
  const endTime = ["COMPLETED", "SHIPPED", "CANCELLED"].includes(status)
    ? addDays(createdAt, Math.max(1, ageDays - rng.int(1, 4)))
    : now;
  const span = endTime.getTime() - createdAt.getTime();
  path.forEach((st, i) => {
    const at = new Date(createdAt.getTime() + (span * i) / Math.max(1, path.length - 1) + rng.int(0, 6) * 600_000);
    const notes = TRANSITION_NOTE[st]?.length ? rng.pick(TRANSITION_NOTE[st]!) : "";
    statusLogs.push({
      id: `slog-${order.id}-${i}`,
      orderId: order.id,
      fromStatus: i === 0 ? null : path[i - 1],
      toStatus: st,
      userId: rng.pick(managers).id,
      notes: notes || undefined,
      at: iso(at),
    });
  });

  // ── production logs for orders that reached the floor ──
  if (path.includes("IN_PROD")) {
    const reached: Station[] = path.includes("QC")
      ? ["reflow", "solder", "test", "assembly"]
      : rng.sample(STATIONS, rng.int(1, 3));
    const orderedStations = STATIONS.filter((s) => reached.includes(s));
    orderedStations.forEach((station, si) => {
      const op = operators.find((o) => o.station === station) ?? rng.pick(operators);
      const startedAt = new Date(createdAt.getTime() + (span * (si + 1)) / (orderedStations.length + 1));
      const outcome: ProductionStatus =
        status === "QC_FAIL" && station === "test" ? "fail" : rng.chance(0.08) ? "rework" : "pass";
      productionLogs.push({
        id: `plog-${order.id}-${station}`,
        orderId: order.id,
        orderItemId: items[0].id,
        station,
        operatorId: op.id,
        startedAt: iso(startedAt),
        completedAt: iso(new Date(startedAt.getTime() + rng.int(25, 140) * 60_000)),
        status: outcome,
        notes: outcome === "rework" ? "Perlu re-solder beberapa joint." : outcome === "fail" ? "Gagal functional test." : undefined,
      });
    });
  }
});

// ── live production board ─────────────────────────────────────
export const queueCards: QueueCard[] = [];
{
  const floorOrders = orders.filter((o) => o.status === "IN_PROD" || o.status === "QC");
  let qi = 0;
  for (const order of floorOrders) {
    const item = order.items[0];
    const bom = boms.find((b) => b.id === item.bomId)!;
    const station: Station = order.status === "QC" ? "test" : rng.pick(["reflow", "solder", "assembly"]);
    const state = rng.chance(0.5) ? "in_progress" : "queued";
    const op = operators.find((o) => o.station === station);
    queueCards.push({
      id: `qc-${qi++}`,
      orderId: order.id,
      orderCode: order.code,
      client: order.client,
      bomName: bom.pcbName,
      revision: bom.revision,
      quantity: item.quantity,
      priority: order.priority,
      dueDate: order.dueDate,
      station,
      state,
      enteredAt: iso(hoursAgo(rng.int(1, 30))),
      operatorId: state === "in_progress" ? op?.id : undefined,
    });
  }
  // pad stations so the board feels busy
  const pad: Station[] = ["reflow", "solder", "assembly", "test", "solder"];
  for (const station of pad) {
    const bom = rng.pick(boms);
    queueCards.push({
      id: `qc-${qi++}`,
      orderId: rng.pick(orders).id,
      orderCode: `PO-2026-${String(++poSeq).padStart(4, "0")}`,
      client: rng.pick(CLIENTS),
      bomName: bom.pcbName,
      revision: bom.revision,
      quantity: rng.pick([15, 20, 30, 40, 50]),
      priority: rng.pick(PRIORITIES),
      dueDate: iso(startOfDay(addDays(now, rng.int(2, 12)))),
      station,
      state: "queued",
      enteredAt: iso(hoursAgo(rng.int(1, 12))),
    });
  }
}

// ── 30-day production series (drives dashboard + reports) ─────
export interface DayProduction {
  date: string; // ISO date (start of day)
  completed: number;
  reject: number;
  byStation: Record<Station, { pass: number; fail: number; rework: number }>;
}

export const production30: DayProduction[] = [];
for (let d = 29; d >= 0; d--) {
  const date = startOfDay(daysAgo(d));
  const dow = date.getDay();
  const weekend = dow === 0 || dow === 6;
  const isToday = d === 0;
  const base = weekend ? rng.int(8, 20) : rng.int(34, 58);
  // today is mid-shift → partial
  const completed = isToday ? Math.floor(base * rng.float(0.45, 0.7)) : base;
  const reject = Math.max(0, Math.round(completed * rng.float(0.015, 0.06)));
  const byStation = {} as DayProduction["byStation"];
  const weights: Record<Station, number> = { reflow: 0.28, solder: 0.3, test: 0.24, assembly: 0.18 };
  for (const s of STATIONS) {
    const pass = Math.round(completed * weights[s]);
    const fail = s === "test" ? Math.round(reject * 0.7) : Math.round((reject * 0.3) / 3);
    byStation[s] = { pass, fail, rework: rng.int(0, 2) };
  }
  production30.push({ date: iso(date), completed, reject, byStation });
}

// mutable db handle + id sequencer for runtime mutations
export const db = {
  users,
  suppliers,
  components,
  boms,
  orders,
  statusLogs,
  productionLogs,
  queueCards,
  production30,
  _seq: 1000,
};

export function nextId(prefix: string): string {
  db._seq += 1;
  return `${prefix}-${db._seq}`;
}
