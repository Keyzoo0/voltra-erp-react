# Voltra ERP — Sistem Manajemen Produksi & Inventory untuk UMKM Elektronika

> Internal tool buat manage workflow produksi PCB assembly, dari PO masuk sampe barang keluar.
> Dibangun karena spreadsheet udah ga sanggup handle volume order yang naik tiap bulan.

![Status](https://img.shields.io/badge/status-production-green)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20FastAPI%20%2B%20PostgreSQL-blue)
![Demo](https://img.shields.io/badge/demo-live%20on%20Vercel-black)

---

## ▶️ Demo

> ⚙️ **Catatan portfolio:** repo ini berisi **frontend showcase** dari Voltra ERP —
> React 18 + TypeScript + Tailwind + Zustand — yang berjalan di atas **mock API in-browser**
> (tanpa backend, zero-setup). Semua data dummy, deterministik, dan reset saat reload.
> Arsitektur backend lengkap (FastAPI / PostgreSQL / Redis / Celery) didokumentasikan di
> [`DESIGN.md`](./DESIGN.md).

**Login:** buka demo, lalu klik salah satu *quick-login* — `admin` · `supervisor` · `operator` · `viewer`.
Password bebas (mode demo).

```bash
# Jalankan lokal
cd client
npm install
npm run dev          # → http://localhost:5173
```

Yang bisa dicoba:

| Area | Highlight |
|------|-----------|
| 🔐 **Role-based access** | Ganti role secara *live* lewat tombol **"Lihat sebagai"** — menu & aksi menyesuaikan RBAC |
| 📋 **Orders** | Finite-state-machine lifecycle, buat order, transisi status + cross-check ketersediaan BOM |
| 📦 **Inventory** | Tabel komponen (sort/filter/paginate server-side), BOM tree view, low-stock alert + auto Purchase Request, adjust stok dengan optimistic locking |
| 🏭 **Production board** | Kanban real-time per workstation (simulasi WebSocket), scan order, throughput chart |
| 📊 **Reports** | Dashboard, laporan harian/bulanan, export async (simulasi Celery + job polling) |

---

## Kenapa Proyek Ini Ada

Awalnya simple — tim produksi tracking order pake Google Sheets. Satu sheet buat PO, satu buat inventory komponen, satu lagi buat log produksi. Masalahnya mulai kerasa waktu order naik dari ~30/bulan jadi 80+. Yang sering kejadian:

- Komponen udah abis tapi baru ketahuan pas mau solder (telat restock 2-3 hari)
- PO double-entry karena admin input manual dari WhatsApp
- Ga ada cara gampang liat "order ini udah sampe tahap mana"
- Laporan bulanan harus compile manual dari 4 sheet berbeda

Jadi ya, dibangun ini. Bukan ERP "enterprise" yang fiturnya kebanyakan — ini tool internal yang solve masalah nyata tim kecil (8 orang) di workshop.

## Apa Aja yang Bisa Dilakukan

### Manajemen Order (PO Tracking)
Lifecycle satu order dari awal sampe selesai:

```
PO Masuk → Validasi BOM → Cek Stok → Antrian Produksi → QC → Packing → Kirim
```

Setiap perpindahan stage di-log, ada timestamp sama siapa yang approve. Kalau ada bottleneck (misal nunggu komponen), status otomatis jadi `HOLD - Waiting Parts` dan trigger notifikasi ke bagian purchasing.

### Inventory & BOM Management
Ini yang paling banyak ngirit waktu. Setiap PCB design punya Bill of Materials (BOM) yang di-link ke inventory. Waktu order masuk, sistem otomatis:

1. Tarik BOM dari database design
2. Cross-check stok per komponen
3. Flag komponen yang stoknya ga cukup
4. Generate draft Purchase Request buat yang kurang

Komponen di-track sampe level reel/batch. Jadi kalau ada defect dari supplier tertentu, bisa trace balik batch mana yang kena.

### Produksi & Workstation Queue
Tiap workstation (reflow, manual solder, testing, assembly) punya queue sendiri. Operator tinggal scan barcode order, otomatis masuk ke queue dia. Supervisor bisa liat real-time:

- Workstation mana yang idle vs overload
- Estimasi completion time per order
- Throughput harian per station

### Laporan & Analytics
Dashboard yang isinya data yang emang dipake, bukan chart cantik doang:

- **Daily production summary** — berapa unit selesai, berapa yang reject, yield rate
- **Inventory turnover** — komponen mana yang perlu restock, mana yang dead stock
- **Order fulfillment rate** — on-time delivery percentage, rata-rata lead time
- **Cost breakdown per order** — BOM cost, labor, overhead (simplified)

Export ke PDF/Excel buat meeting bulanan sama manajemen.

## Tech Stack & Kenapa Dipilih

| Layer | Tech | Alasan |
|-------|------|--------|
| Frontend | React 18 + TypeScript | Tim udah familiar, ecosystem besar |
| Styling | Tailwind CSS v3 | Cepet iterasi UI, ga perlu maintain CSS files terpisah |
| State | Zustand | Lightweight, ga overkill kayak Redux buat skala ini |
| Backend | FastAPI (Python) | Async, auto-generate OpenAPI docs, Python ecosystem buat data processing |
| Database | PostgreSQL 15 | Relational data yang heavy-linked (BOM → komponen → supplier → batch). NoSQL ga masuk akal di sini |
| Cache | Redis | Session, rate limiting, sama cache query inventory yang sering dipanggil |
| Task Queue | Celery + Redis | Background job: generate report PDF, sync stok, kirim notifikasi |
| Auth | JWT + Role-based | 4 role: Admin, Supervisor, Operator, Viewer |
| Deploy | Docker Compose | Server on-premise di workshop. Ga perlu cloud, data sensitif |

### Kenapa Ga Pake [X]?

**"Kenapa ga pake Odoo/ERPNext?"** — Pernah coba. Setup-nya overkill buat kebutuhan kita, modul yang ga dipake lebih banyak dari yang dipake. Customization juga ribet, setiap update Odoo bisa break custom module. Mending bikin yang fit sama workflow sendiri.

**"Kenapa backend Python, bukan Node?"** — Karena ada beberapa logic yang butuh numpy/pandas (kalkulasi BOM cost optimization, forecasting demand sederhana). Daripada maintain dua runtime, sekalian Python aja.

**"Kenapa on-premise?"** — Data BOM dan harga supplier itu sensitif. Client juga ada yang minta NDA, jadi lebih aman data ga keluar network lokal. Plus, internet di workshop kadang mati — sistem harus tetap jalan.

## Struktur Proyek

```
voltra-erp/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Button, Modal, Table, Toast, dll
│   │   │   ├── orders/        # OrderList, OrderDetail, OrderTimeline
│   │   │   ├── inventory/     # StockTable, BOMEditor, ReorderAlert
│   │   │   ├── production/    # WorkstationQueue, ProductionBoard
│   │   │   └── reports/       # DashboardCharts, ReportExport
│   │   ├── hooks/             # useAuth, useInventory, useWebSocket
│   │   ├── stores/            # Zustand stores
│   │   ├── pages/             # Route-level components
│   │   ├── utils/             # Formatter, validators, constants
│   │   └── types/             # TypeScript interfaces
│   └── vite.config.ts
│
├── server/                    # FastAPI backend
│   ├── api/
│   │   ├── routes/
│   │   │   ├── orders.py
│   │   │   ├── inventory.py
│   │   │   ├── production.py
│   │   │   ├── reports.py
│   │   │   └── auth.py
│   │   └── deps.py            # Dependencies (DB session, auth)
│   ├── core/
│   │   ├── config.py          # Environment config
│   │   ├── security.py        # JWT, hashing
│   │   └── exceptions.py
│   ├── models/                # SQLAlchemy models
│   ├── schemas/               # Pydantic request/response
│   ├── services/              # Business logic layer
│   │   ├── bom_service.py
│   │   ├── stock_service.py
│   │   └── order_service.py
│   ├── tasks/                 # Celery background tasks
│   │   ├── report_generator.py
│   │   ├── stock_sync.py
│   │   └── notification.py
│   └── migrations/            # Alembic migrations
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── Makefile                   # Shortcut commands
└── docs/
    ├── DESIGN.md              # Arsitektur & keputusan teknis
    ├── API.md                 # Endpoint reference
    ├── DEPLOYMENT.md          # Setup guide
    └── CHANGELOG.md
```

## Setup Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (buat development frontend aja, production di-bundle)
- Python 3.11+
- PostgreSQL 15 (atau pake yang di Docker)

### Quick Start

```bash
# Clone & setup environment
git clone https://github.com/Keyzoo0/voltra-erp.git
cd voltra-erp
cp .env.example .env          # Edit sesuai local config

# Start semua service via Docker
make dev                       # = docker compose -f docker-compose.dev.yml up

# Atau manual kalau mau develop terpisah:
# Terminal 1 — Backend
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head           # Run migrations
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd client
npm install
npm run dev                    # Vite dev server di :5173
```

### Seed Data

```bash
# Insert sample data buat testing
python server/scripts/seed.py

# Ini bakal bikin:
# - 3 user (admin, supervisor, operator)
# - 50 komponen dengan stok random
# - 10 BOM template
# - 20 sample orders di berbagai stage
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://voltra:secret@localhost:5432/voltra_erp

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
JWT_SECRET=ganti-ini-jangan-lupa     # WAJIB ganti di production
JWT_EXPIRE_MINUTES=480               # 8 jam, satu shift

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:5173
```

## Database Schema (Simplified)

Relasi utama yang drive seluruh sistem:

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│  orders   │────→│ order_items   │────→│   bom      │
│           │     │              │     │            │
│ id        │     │ order_id     │     │ id         │
│ client    │     │ bom_id       │     │ pcb_name   │
│ status    │     │ qty          │     │ revision   │
│ priority  │     │ unit_cost    │     │ created_at │
│ due_date  │     └──────────────┘     └─────┬──────┘
│ created_by│                                │
└──────────┘                                 │
                                             ▼
┌──────────────┐     ┌──────────────┐  ┌──────────────┐
│  suppliers   │────→│ components   │←─│ bom_lines    │
│              │     │              │  │              │
│ id           │     │ id           │  │ bom_id       │
│ name         │     │ part_number  │  │ component_id │
│ contact      │     │ description  │  │ qty_per_unit │
│ lead_time    │     │ stock_qty    │  │ designator   │
│ rating       │     │ min_stock    │  └──────────────┘
└──────────────┘     │ location     │
                     │ supplier_id  │
                     └──────────────┘

┌──────────────────┐
│ production_logs   │
│                  │
│ id               │
│ order_item_id    │
│ station          │  ← enum: reflow, solder, test, assembly
│ operator_id      │
│ started_at       │
│ completed_at     │
│ status           │  ← pass, fail, rework
│ notes            │
└──────────────────┘
```

## API Endpoints (Highlight)

Full docs di `/api/docs` (Swagger UI auto-generated dari FastAPI).

```
Auth
  POST   /api/auth/login          Login, return JWT
  POST   /api/auth/refresh        Refresh token
  GET    /api/auth/me             Current user info

Orders
  GET    /api/orders              List orders (filter by status, date, client)
  POST   /api/orders              Create new order
  GET    /api/orders/{id}         Detail + timeline
  PATCH  /api/orders/{id}/status  Update stage (trigger workflow)
  GET    /api/orders/{id}/bom     BOM breakdown + stok availability

Inventory
  GET    /api/inventory           List components (search, filter low stock)
  POST   /api/inventory           Add new component
  PATCH  /api/inventory/{id}      Update stock (manual adjust)
  GET    /api/inventory/alerts    Components below min_stock threshold
  POST   /api/inventory/bulk      Bulk update dari CSV (import dari supplier)

Production
  GET    /api/production/queue    Queue per workstation
  POST   /api/production/scan     Operator scan barcode → assign ke station
  PATCH  /api/production/{id}     Update status (pass/fail/rework)
  GET    /api/production/stats    Throughput, yield, utilization

Reports
  GET    /api/reports/daily       Summary hari ini
  GET    /api/reports/monthly     Monthly aggregation
  POST   /api/reports/export      Generate PDF/Excel (async, return job ID)
  GET    /api/reports/export/{id} Download generated report
```

## Screenshot

> *Note: screenshot diambil dari staging environment dengan data dummy*

### Dashboard Utama
Overview harian — order aktif, inventory alert, production throughput. Widget bisa di-rearrange per user.

### Production Board
Kanban-style view per workstation. Drag-and-drop buat reprioritize queue. Warna card based on priority dan proximity ke due date.

### BOM Editor
Tree view dari BOM satu PCB. Inline edit quantity, swap komponen alternatif, auto-calculate total cost. Highlight merah kalau stok ga cukup.

### Inventory Alert
Table komponen yang dibawah minimum stock. One-click generate Purchase Request ke supplier. History harga buat comparison.

## Hal yang Masih Kurang / Mau Ditambah

Jujur ini belum sempurna. Beberapa hal yang masih di backlog:

- [ ] **Barcode scanner integration** — Sekarang masih manual input nomor order. Rencana pake USB barcode scanner + WebHID API atau fallback ke camera scan
- [ ] **Supplier portal** — Biar supplier bisa langsung update harga dan lead time tanpa harus email bolak-balik
- [ ] **Mobile view yang proper** — Sekarang responsive tapi belum dioptimize buat operator yang pake HP di lantai produksi
- [ ] **Automated reorder** — Kalau stok dibawah threshold, auto-generate PO ke supplier. Sekarang masih semi-manual (alert → admin review → kirim)
- [ ] **Multi-currency** — Beberapa supplier dari China/Thailand, harus convert manual. Mau integrate exchange rate API
- [ ] **Proper audit trail** — Sekarang cuma log status change. Mau track semua field change buat compliance

## Lessons Learned

Beberapa hal yang aku pelajari selama develop ini:

**Database schema itu investasi.** Pertama kali design schema terlalu normalized — query jadi lambat, banyak JOIN. Akhirnya denormalize beberapa field yang sering di-query bareng (misal `order.total_cost` yang seharusnya bisa di-compute dari BOM, tapi di-cache sebagai column).

**Jangan underestimate role management.** Awalnya cuma 2 role (admin & user). Ternyata supervisor butuh akses berbeda dari operator, viewer dari manajemen butuh liat report tapi ga boleh edit. Refactor auth di tengah jalan itu painful.

**WebSocket buat real-time itu worth it.** Awalnya polling setiap 30 detik buat update production board. Pindah ke WebSocket bikin UX jauh lebih responsive, terutama di production floor dimana beberapa operator update status hampir barengan.

**Background task itu penyelamat.** Report generation yang butuh aggregate data sebulan ga boleh blocking. Celery + Redis nge-solve ini dengan elegan — user klik export, dapet notifikasi kalau udah selesai.

## Kontribusi

Ini proyek internal, tapi kalau ada yang mau refer arsitekturnya atau diskusi implementasi, feel free buka issue atau reach out.

## Lisensi

Proprietary — Voltra Techno. Dokumentasi ini di-share untuk portfolio purpose.

---

*Dibangun dengan kopi dan deadline yang mepet.*
*Last updated: Mei 2025*
