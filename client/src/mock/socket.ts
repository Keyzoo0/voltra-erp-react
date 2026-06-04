// Simulated production-floor "WebSocket". Owns the live board state,
// pushes updates to subscribers, and runs a low-key background
// simulation so the board visibly moves like a real shop floor.
import type { QueueCard, Station } from "@/types";
import { STATIONS } from "@/lib/domain";
import { createRng } from "./rng";
import { db, nextId } from "./seed";

type Listener = (cards: QueueCard[]) => void;

const NEXT_STATION: Record<Station, Station | null> = {
  reflow: "solder",
  solder: "test",
  test: "assembly",
  assembly: null, // exits board → goes to QC/packing
};

const listeners = new Set<Listener>();
const rng = createRng(0xa17c0de);
let timer: ReturnType<typeof setInterval> | null = null;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function snapshot(): QueueCard[] {
  return clone(db.queueCards);
}

function emit() {
  const snap = snapshot();
  listeners.forEach((l) => l(snap));
}

function assignOperator(station: Station): string | undefined {
  const op = db.users.find((u) => u.role === "operator" && u.station === station);
  return op?.id;
}

/** advance one card by a single step (queued → in_progress → next station / exit). */
export function advanceCard(cardId: string): QueueCard[] {
  const idx = db.queueCards.findIndex((c) => c.id === cardId);
  if (idx === -1) return snapshot();
  const card = db.queueCards[idx];

  if (card.state === "queued") {
    card.state = "in_progress";
    card.operatorId = assignOperator(card.station) ?? card.operatorId;
  } else if (card.state === "in_progress") {
    const next = NEXT_STATION[card.station];
    if (next) {
      card.station = next;
      card.state = "queued";
      card.operatorId = undefined;
      card.enteredAt = new Date().toISOString();
    } else {
      // finished assembly → leaves the floor
      db.queueCards.splice(idx, 1);
    }
  }
  emit();
  return snapshot();
}

/** operator scans an order into a station (barcode flow). */
export function scanCard(input: {
  orderCode: string;
  client: string;
  bomName: string;
  revision: string;
  quantity: number;
  priority: QueueCard["priority"];
  dueDate: string;
  station: Station;
  orderId?: string;
}): QueueCard {
  const card: QueueCard = {
    id: nextId("qc"),
    orderId: input.orderId ?? nextId("ord"),
    orderCode: input.orderCode,
    client: input.client,
    bomName: input.bomName,
    revision: input.revision,
    quantity: input.quantity,
    priority: input.priority,
    dueDate: input.dueDate,
    station: input.station,
    state: "queued",
    enteredAt: new Date().toISOString(),
  };
  db.queueCards.unshift(card);
  emit();
  return clone(card);
}

// background simulation — gentle, never lets the board empty or overflow
function tick() {
  const inProgress = db.queueCards.filter((c) => c.state === "in_progress");
  const queued = db.queueCards.filter((c) => c.state === "queued");

  if (inProgress.length && rng.chance(0.55)) {
    advanceCard(rng.pick(inProgress).id);
    return;
  }
  if (queued.length && db.queueCards.filter((c) => c.state === "in_progress").length < 6) {
    advanceCard(rng.pick(queued).id);
    return;
  }
  // top up if the floor is getting empty
  if (db.queueCards.length < 12 && rng.chance(0.6)) {
    const bom = rng.pick(db.boms);
    scanCard({
      orderCode: `PO-2026-${rng.int(140, 320)}`,
      client: rng.pick(db.orders).client,
      bomName: bom.pcbName,
      revision: bom.revision,
      quantity: rng.pick([15, 20, 30, 40, 50]),
      priority: rng.pick(["low", "normal", "high", "urgent"]),
      dueDate: new Date(Date.now() + rng.int(2, 10) * 86_400_000).toISOString(),
      station: rng.pick(STATIONS),
    });
  }
}

export function subscribeBoard(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot());
  if (!timer) {
    timer = setInterval(tick, 3600);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function getBoard(): QueueCard[] {
  return snapshot();
}
