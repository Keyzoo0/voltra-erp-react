# DESIGN.md — Arsitektur & Keputusan Teknis Voltra ERP

> Dokumen ini ngejelasin kenapa sistem didesain seperti ini, tradeoff yang diambil,
> dan beberapa kesalahan yang udah diperbaiki di jalan. Bukan best-practice guide —
> ini catatan real dari build system buat tim kecil dengan constraint yang nyata.

---

## Gambaran Besar

Voltra ERP itu monolith yang dipisah jadi dua deployment unit: React SPA (client) dan FastAPI (server). Bukan microservice, bukan serverless — karena ga perlu. Tim yang maintain cuma 1-2 orang, infrastrukturnya satu server fisik di workshop. Overhead orchestration Kubernetes atau service mesh sama sekali ga masuk akal di sini.

```
┌─────────────────────────────────────────────────────────┐
│                     NETWORK LOKAL                       │
│                                                         │
│   ┌───────────┐          ┌───────────┐                  │
│   │  Browser   │──HTTP──→│  Nginx    │                  │
│   │  (Operator │         │  :80/:443 │                  │
│   │   / Admin) │         └─────┬─────┘                  │
│   └───────────┘                │                        │
│                         ┌──────┴──────┐                 │
│                         │             │                 │
│                    /app/*        /api/*                  │
│                         │             │                 │
│                   ┌─────▼─────┐ ┌─────▼──────┐          │
│                   │  React    │ │  FastAPI    │          │
│                   │  Static   │ │  :8000      │          │
│                   │  Build    │ │  (Uvicorn   │          │
│                   └───────────┘ │   4 workers)│          │
│                                 └──────┬─────┘          │
│                                        │                │
│                         ┌──────────────┼────────┐       │
│                         │              │        │       │
│                   ┌─────▼─────┐  ┌─────▼──┐ ┌───▼───┐  │
│                   │ PostgreSQL│  │ Redis  │ │Celery │  │
│                   │ :5432     │  │ :6379  │ │Worker │  │
│                   └───────────┘  └────────┘ └───────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Semua jalan di satu mesin (Intel Xeon E-2224, 32GB RAM, SSD 1TB). Lebih dari cukup buat 8 concurrent user dan ~100 order/bulan. Overkill? Mungkin. Tapi harga server bekas segini udah murah, dan headroom itu bikin tidur lebih nyenyak.

## Keputusan Arsitektur yang Perlu Dijelasin

### 1. Kenapa Monolith, Bukan Microservice

Aku tau microservice itu trendy. Tapi buat konteks ini:

- Tim developer: 1 orang full-time (aku), 1 part-time
- User: 8 orang, satu lokasi fisik
- Data flow: linear (order → inventory → production → report)
- Scaling concern: nyaris nol, growth gradual

Kalau aku pecah jadi service terpisah, yang terjadi:
- 5 repo yang harus maintain versi API-nya sinkron
- Docker container nambah, RAM kepake buat overhead runtime
- Debugging distributed system sendirian — ga, makasih

Monolith dengan separation of concern yang bener udah lebih dari cukup. Service layer di backend itu batasnya — `OrderService` ga boleh langsung query tabel `components`, harus lewat `StockService`. Jadi kalau suatu hari emang perlu dipecah, boundary-nya udah jelas.

### 2. FastAPI Bukan Django

Django REST Framework itu mature dan banyak yang pake buat ERP. Tapi aku pilih FastAPI karena:

**Async by default.** WebSocket buat production board butuh async handler. Di Django, harus tambahin Channels yang nambah complexity. Di FastAPI, tinggal `async def websocket_endpoint()`.

**Type safety end-to-end.** Pydantic schema di backend itu bisa di-export jadi TypeScript types (pake `datamodel-codegen`). Jadi kalau aku ubah response shape di backend, frontend langsung error di compile time. Ini nge-save banyak bug yang biasanya baru ketahuan di runtime.

**Auto-generated docs yang actually useful.** Swagger UI dari FastAPI itu ga cuma dokumentasi — tim lain (admin, supervisor) bisa langsung test endpoint di browser tanpa harus install Postman. Ini surprisingly berguna buat debug bareng non-technical user.

Tradeoff: Django punya admin panel gratis yang lumayan powerful. Di FastAPI aku harus build admin view sendiri. Tapi karena admin panel-nya custom-tailored ke workflow kita, ini malah jadi advantage — ga ada fitur yang confusing.

### 3. PostgreSQL sebagai Single Source of Truth

Sempet consider MongoDB karena BOM structure itu nested (PCB → komponen → sub-assembly). Tapi:

- BOM itu relational by nature. Satu komponen bisa dipake di banyak BOM. Many-to-many itu domain-nya RDBMS.
- Inventory transaction harus ACID. Ga boleh stok minus karena race condition dua operator ambil komponen barengan.
- Reporting butuh aggregation yang complex. SQL window functions buat calculate moving average, year-over-year comparison — ini painful di MongoDB.

Schema design-nya aku usahain balance antara normalization dan practicality:

```sql
-- Contoh: order_items sengaja punya unit_cost walaupun bisa di-derive dari BOM
-- karena harga komponen bisa berubah, tapi cost waktu order dibuat harus frozen

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    bom_id UUID REFERENCES boms(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL,  -- frozen at order creation time
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial index buat query yang paling sering dipanggil
CREATE INDEX idx_orders_active ON orders(status, due_date)
    WHERE status NOT IN ('completed', 'cancelled');

-- Trigger buat auto-update stock waktu production log masuk
CREATE OR REPLACE FUNCTION update_stock_on_production()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pass' THEN
        -- Decrement component stock based on BOM
        UPDATE components c
        SET stock_qty = stock_qty - (bl.qty_per_unit * oi.quantity)
        FROM bom_lines bl
        JOIN order_items oi ON oi.bom_id = bl.bom_id
        WHERE bl.component_id = c.id
        AND oi.id = NEW.order_item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Satu hal yang aku sesali: awalnya pake `SERIAL` buat primary key. Ganti ke UUID di tengah jalan itu migration-nya bikin stress. Harusnya UUID dari awal — buat sistem yang nantinya mungkin perlu sync antar lokasi, auto-increment ID itu problematic.

### 4. State Machine buat Order Lifecycle

Order status bukan cuma field string yang bisa diubah sembarangan. Ada finite state machine yang enforce transisi valid:

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    ▼                                 │
 ┌──────┐    ┌──────────┐    ┌──────────┐    ┌───────┴──┐
 │ DRAFT│───→│ CONFIRMED│───→│ IN_PROD  │───→│ QC       │
 └──┬───┘    └────┬─────┘    └────┬─────┘    └───┬──────┘
    │             │               │               │
    │             │               │          ┌────▼─────┐
    │             │               │          │ QC_FAIL  │──→ (rework, balik ke IN_PROD)
    │             │               │          └──────────┘
    │             │               │               │
    │             │               │          ┌────▼─────┐    ┌──────────┐
    │             │               │          │ PACKING  │───→│ SHIPPED  │
    │             │               │          └──────────┘    └────┬─────┘
    │             │               │                               │
    │             ▼               ▼                          ┌────▼─────┐
    │        ┌─────────┐    ┌─────────┐                     │COMPLETED │
    └───────→│CANCELLED│    │ ON_HOLD │                     └──────────┘
             └─────────┘    └─────────┘
```

Implementasinya di backend:

```python
# server/services/order_state.py

VALID_TRANSITIONS = {
    "DRAFT":     ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["IN_PROD", "ON_HOLD", "CANCELLED"],
    "IN_PROD":   ["QC", "ON_HOLD"],
    "ON_HOLD":   ["IN_PROD", "CONFIRMED", "CANCELLED"],
    "QC":        ["QC_FAIL", "PACKING"],
    "QC_FAIL":   ["IN_PROD"],  # rework
    "PACKING":   ["SHIPPED"],
    "SHIPPED":   ["COMPLETED"],
}

class OrderStateMachine:
    def __init__(self, order):
        self.order = order

    def can_transition(self, new_status: str) -> bool:
        allowed = VALID_TRANSITIONS.get(self.order.status, [])
        return new_status in allowed

    def transition(self, new_status: str, user_id: str, notes: str = ""):
        if not self.can_transition(new_status):
            raise InvalidTransition(
                f"Ga bisa pindah dari {self.order.status} ke {new_status}. "
                f"Yang valid: {VALID_TRANSITIONS.get(self.order.status, [])}"
            )

        old_status = self.order.status
        self.order.status = new_status

        # Side effects per transition
        if new_status == "CONFIRMED":
            self._reserve_stock()
        elif new_status == "CANCELLED":
            self._release_reserved_stock()
        elif new_status == "SHIPPED":
            self._deduct_stock_final()

        # Log transition
        create_status_log(self.order.id, old_status, new_status, user_id, notes)
```

Kenapa ga pake library state machine (misal `transitions`)? Karena logic side effect-nya terlalu spesifik ke domain kita. Library generic bakal bikin aku wrap semuanya jadi callback, yang pada akhirnya sama aja nulis sendiri tapi dengan abstraksi tambahan.

### 5. Real-time Updates via WebSocket

Production board itu layar yang dipajang di workshop — nunjukin status semua order yang lagi jalan. Awalnya pake polling (fetch setiap 30 detik). Masalahnya:

- 30 detik itu lama kalau operator baru aja scan order dan supervisor mau langsung liat
- 8 client polling tiap 30 detik = 16 request/menit yang isinya "ga ada yang berubah"
- Race condition: dua operator liat stale data, dua-duanya ambil job yang sama

Pindah ke WebSocket:

```python
# server/api/routes/ws.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

class ProductionBroadcaster:
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}  # station -> connections

    async def connect(self, ws: WebSocket, station: str):
        await ws.accept()
        if station not in self.connections:
            self.connections[station] = set()
        self.connections[station].add(ws)

    async def broadcast(self, station: str, event: dict):
        dead = set()
        for ws in self.connections.get(station, set()):
            try:
                await ws.send_json(event)
            except Exception:
                dead.add(ws)

        # Cleanup dead connections
        self.connections[station] -= dead

broadcaster = ProductionBroadcaster()
```

Di frontend, reconnection logic itu penting. Koneksi WebSocket bisa putus (WiFi workshop ga stabil), jadi ada exponential backoff:

```typescript
// client/src/hooks/useProductionSocket.ts

function useProductionSocket(station: string) {
  const [queue, setQueue] = useState<OrderItem[]>([]);
  const retryRef = useRef(0);

  useEffect(() => {
    let ws: WebSocket;
    let timeout: NodeJS.Timeout;

    function connect() {
      ws = new WebSocket(`ws://${API_HOST}/ws/production/${station}`);

      ws.onopen = () => {
        retryRef.current = 0; // reset backoff
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'queue_update') {
          setQueue(data.queue);
        }
      };

      ws.onclose = () => {
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current++;
        timeout = setTimeout(connect, delay);
      };
    }

    connect();
    return () => { ws?.close(); clearTimeout(timeout); };
  }, [station]);

  return queue;
}
```

### 6. Inventory: Optimistic Locking buat Cegah Race Condition

Skenario: dua operator mau ambil komponen yang sama, stok sisa 10. Operator A ambil 6, operator B ambil 7. Kalau ga di-handle, stok bisa minus.

Solusinya: optimistic locking pake version column.

```python
# server/services/stock_service.py

async def deduct_stock(component_id: str, qty: int, db: AsyncSession):
    # Attempt deduction with optimistic lock
    result = await db.execute(
        update(Component)
        .where(
            Component.id == component_id,
            Component.stock_qty >= qty,        # sufficient stock check
            Component.version == select(Component.version)  # optimistic lock
                .where(Component.id == component_id)
                .scalar_subquery()
        )
        .values(
            stock_qty=Component.stock_qty - qty,
            version=Component.version + 1,
            updated_at=func.now()
        )
        .returning(Component.stock_qty)
    )

    if result.rowcount == 0:
        # Either insufficient stock or concurrent modification
        current = await db.get(Component, component_id)
        if current.stock_qty < qty:
            raise InsufficientStock(component_id, current.stock_qty, qty)
        else:
            raise ConcurrentModification("Stok baru aja diupdate orang lain, coba lagi")
```

Kenapa optimistic bukan pessimistic (SELECT FOR UPDATE)? Karena konflik itu jarang — biasanya tiap operator kerja di workstation berbeda dengan komponen berbeda. Pessimistic locking bakal bikin overhead di 99% case yang ga perlu.

## Frontend Architecture

### Component Organization

Bukan atomic design yang strict — terlalu banyak layer buat tim kecil. Yang dipake lebih pragmatis:

```
components/
├── common/          # Reusable, ga ada business logic
│   ├── Button.tsx
│   ├── DataTable.tsx    # Generic table with sort, filter, pagination
│   ├── Modal.tsx
│   ├── StatusBadge.tsx
│   └── SearchInput.tsx
│
├── orders/          # Order-specific components
│   ├── OrderList.tsx
│   ├── OrderDetail.tsx
│   ├── OrderTimeline.tsx    # Visual timeline status changes
│   └── OrderForm.tsx
│
├── inventory/
│   ├── StockTable.tsx
│   ├── BOMTreeView.tsx      # Nested tree view BOM
│   ├── LowStockAlert.tsx
│   └── ComponentForm.tsx
│
└── production/
    ├── ProductionBoard.tsx   # Kanban board
    ├── StationCard.tsx       # Individual workstation
    ├── QueueItem.tsx         # Draggable order card
    └── ThroughputChart.tsx   # Recharts line chart
```

### State Management Strategy

Zustand dipilih karena API-nya minimal dan ga ada boilerplate kayak Redux.

```typescript
// stores/inventoryStore.ts

interface InventoryStore {
  components: Component[];
  lowStockAlerts: Component[];
  isLoading: boolean;

  fetchComponents: (filters?: ComponentFilter) => Promise<void>;
  updateStock: (id: string, qty: number) => Promise<void>;
}

const useInventoryStore = create<InventoryStore>((set, get) => ({
  components: [],
  lowStockAlerts: [],
  isLoading: false,

  fetchComponents: async (filters) => {
    set({ isLoading: true });
    try {
      const data = await api.inventory.list(filters);
      set({
        components: data.items,
        lowStockAlerts: data.items.filter(c => c.stock_qty <= c.min_stock),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  updateStock: async (id, qty) => {
    await api.inventory.adjust(id, qty);
    // Optimistic update
    set(state => ({
      components: state.components.map(c =>
        c.id === id ? { ...c, stock_qty: c.stock_qty + qty } : c
      ),
    }));
  },
}));
```

Rule: store cuma buat data yang di-share antar halaman. Data yang cuma dipake di satu page, pake local state aja. Ga semua harus masuk global store.

### Data Table yang Ga Bikin Frustasi

Ini komponen yang paling sering dipake dan paling banyak iterasinya. Requirements:

- Sort by any column (server-side, bukan client)
- Filter per column (text search, dropdown, date range)
- Pagination yang bener (bukan load semua terus slice)
- Column resize
- Bulk action (select multiple → update status / export)
- Keyboard navigation (tab antar cell, enter buat edit)

Pake `@tanstack/react-table` sebagai headless core, styling manual pake Tailwind. Awalnya coba pake Ant Design table — bagus tapi bundle size-nya gede dan styling-nya susah di-override kalau mau consistent sama design system kita.

## Authentication & Authorization

### JWT Flow

```
Login                                  Protected Request
┌──────┐    ┌──────┐                  ┌──────┐    ┌──────┐
│Client│    │Server│                  │Client│    │Server│
└──┬───┘    └──┬───┘                  └──┬───┘    └──┬───┘
   │  POST     │                        │  GET     │
   │  /login   │                        │  /orders │
   │  {user,   │                        │  Auth:   │
   │   pass}   │                        │  Bearer  │
   │──────────→│                        │  {token} │
   │           │ verify                 │──────────→│
   │           │ password               │           │ decode JWT
   │           │ hash                   │           │ check expiry
   │           │                        │           │ check role
   │  {access  │                        │           │
   │   token,  │                        │  200 OK  │
   │   refresh}│                        │  {data}  │
   │←──────────│                        │←──────────│
```

Access token expire tiap 8 jam (satu shift kerja). Refresh token expire tiap 7 hari. Kalau operator lupa logout, session mati sendiri di akhir shift.

### Role-Based Access

4 role dengan permission yang jelas:

| Action | Admin | Supervisor | Operator | Viewer |
|--------|-------|------------|----------|--------|
| Create/edit order | ✓ | ✓ | ✗ | ✗ |
| Update order status | ✓ | ✓ | limited* | ✗ |
| View inventory | ✓ | ✓ | ✓ | ✓ |
| Adjust stock | ✓ | ✓ | ✗ | ✗ |
| Production scan | ✓ | ✓ | ✓ | ✗ |
| View reports | ✓ | ✓ | ✗ | ✓ |
| Export reports | ✓ | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ | ✗ |

*Operator cuma bisa update status di workstation yang di-assign ke dia.

Implementasi di backend pake dependency injection:

```python
# server/api/deps.py

def require_role(*roles: str):
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(403, "Ga punya akses buat ini")
        return current_user
    return checker

# Usage di route
@router.post("/orders")
async def create_order(
    order: OrderCreate,
    user: User = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
):
    ...
```

## Performance Considerations

### Query Optimization yang Terasa Impact-nya

**Problem 1: Dashboard load lambat.**
Root cause: dashboard narik data dari 4 tabel berbeda, masing-masing query sendiri. 4 round-trip ke database buat 1 page load.

Fix: bikin satu stored procedure yang return semua data dashboard sekaligus. Dari 4 query jadi 1, load time dari ~800ms jadi ~200ms.

**Problem 2: Inventory search lag.**
Root cause: `LIKE '%keyword%'` di kolom `description` yang isinya teks panjang. Full table scan.

Fix: `pg_trgm` extension + GIN index buat trigram similarity search. Bonus: typo-tolerant jadi "resitor" masih bisa nemu "resistor".

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_components_description_trgm
    ON components USING GIN (description gin_trgm_ops);
```

**Problem 3: Report generation timeout.**
Root cause: monthly report aggregate >10,000 production logs. Timeout di 30 detik.

Fix: pindahin ke Celery background task. User klik generate → dapet job ID → polling status → download waktu selesai. Tambahin materialized view buat pre-aggregate data per hari.

### Caching Strategy

Redis dipake buat 3 hal:

1. **Session/JWT blacklist** — Token yang di-revoke (user logout / ganti password) masuk blacklist di Redis. TTL = sisa lifetime token. Lebih cepet dari query database tiap request.

2. **Inventory snapshot** — Data stok komponen yang di-cache 60 detik. Invalidated waktu ada transaksi stok baru. Dashboard narik dari cache, bukan query langsung.

3. **Rate limiting** — Max 100 request/menit per user. Sliding window pake Redis sorted set. Ini buat jaga-jaga aja, belum pernah kena.

## Deployment

### Docker Compose (Production)

```yaml
# docker-compose.yml (simplified)
services:
  app:
    build: ./server
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://voltra:${DB_PASS}@db:5432/voltra_erp
      REDIS_URL: redis://cache:6379/0
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_started }
    restart: unless-stopped

  worker:
    build: ./server
    command: celery -A tasks worker --loglevel=info --concurrency=2
    depends_on: [app, cache]
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: voltra_erp
      POSTGRES_USER: voltra
      POSTGRES_PASSWORD: ${DB_PASS}
    healthcheck:
      test: pg_isready -U voltra
      interval: 10s

  cache:
    image: redis:7-alpine
    volumes: ["redisdata:/data"]

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./client/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on: [app]

volumes:
  pgdata:
  redisdata:
```

### Backup Strategy

Jangan sampe kehilangan data karena SSD mati.

- **Database**: `pg_dump` setiap 6 jam via cron, compressed, simpan di NAS + upload ke Google Drive (encrypted)
- **Retention**: daily backup 30 hari, weekly backup 6 bulan
- **Test restore**: sebulan sekali restore ke staging environment, verify data integrity. Ini sering di-skip (jujur), tapi penting.

```bash
# /etc/cron.d/voltra-backup
0 */6 * * * root /opt/voltra/scripts/backup.sh >> /var/log/voltra-backup.log 2>&1
```

## Error Handling Philosophy

Di production, error itu pasti terjadi. Yang penting gimana handle-nya:

**Backend**: semua exception di-catch di middleware level. User dapet error message yang manusiawi ("Stok ga cukup, sisa 3 unit"), bukan stack trace. Tapi di log server, full traceback tetep ke-record.

**Frontend**: error boundary di level page. Kalau satu halaman error, halaman lain tetep jalan. Toast notification buat error yang recoverable ("Gagal save, coba lagi"). Full-page error buat yang critical ("Session expired, login ulang").

**Monitoring**: belum pake Sentry atau Grafana (overkill buat skala ini). Structured logging ke file, di-rotate daily, grep kalau ada masalah. Kalau scale nanti, baru invest di proper monitoring.

## Hal yang Bakal Aku Lakuin Beda Kalau Mulai dari Nol

1. **Pake UUID dari hari pertama.** Migration dari SERIAL ke UUID itu nightmare.

2. **Design mobile-first.** Operator di production floor pake HP, bukan desktop. Harusnya UI di-optimize buat touchscreen kecil dari awal, bukan di-retrofit.

3. **Event sourcing buat inventory.** Sekarang cuma track current stock. Kalau ada discrepancy, susah trace "kapan stok ini berubah dan kenapa". Event log (stock_in, stock_out, adjustment, correction) harusnya jadi first-class citizen.

4. **API versioning dari awal.** Sekarang semua di `/api/`. Kalau mau breaking change, harus koordinasi deploy frontend dan backend barengan. `/api/v1/` dari awal bakal ngasih flexibility.

5. **Testing yang lebih proper.** Jujur, test coverage masih sekitar 45%. Yang di-test baru service layer (business logic). API endpoint test dan integration test masih kurang. Ini technical debt yang paling bikin gelisah.

---

*Dokumen ini living document — di-update seiring sistem berkembang. Last revision: Mei 2025.*
