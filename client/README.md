# Voltra ERP — Frontend

Frontend showcase untuk **Voltra ERP** (sistem manajemen produksi & inventory PCB assembly).
Dibangun dengan React 18 + TypeScript + Tailwind, berjalan di atas **mock API in-browser** —
tidak butuh backend untuk dijalankan.

> Konteks produk & arsitektur backend lengkap ada di [`../README.md`](../README.md) dan
> [`../DESIGN.md`](../DESIGN.md).

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + Vite 5 |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS v3 — tema *"Workshop Console"* (CSS variables) |
| State | Zustand (auth, UI/toasts) |
| Routing | React Router v6 |
| Tabel | TanStack Table v8 (headless, server-side sort/filter/pagination) |
| Chart | Recharts |
| Animasi | Framer Motion |
| Ikon | lucide-react |
| Font | Archivo · Hanken Grotesk · JetBrains Mono (`@fontsource`, self-hosted) |

## Menjalankan

```bash
npm install
npm run dev          # dev server  → http://localhost:5173
npm run build        # type-check (tsc) + production build → dist/
npm run preview      # serve hasil build
npm run typecheck    # type-check saja
```

Butuh **Node 18+** (dikembangkan di Node 22).

## Mock API

Tidak ada backend. Lapisan `src/mock/` mensimulasikan FastAPI:

- **`seed.ts`** — data dummy deterministik (seeded PRNG): users, suppliers, ~50 komponen,
  10 BOM, ~22 order di semua tahap lifecycle, production log, series 30 hari.
- **`api.ts`** — surface API async (latency disimulasikan) + business rules nyata:
  finite-state-machine transisi order, reservasi/deduksi stok, **optimistic locking**.
- **`socket.ts`** — simulasi WebSocket production board (push update berkala → board bergerak live).

Karena in-memory, semua perubahan **reset saat reload** — demo selalu konsisten.

## Struktur

```
src/
├── components/
│   ├── common/      # Button, DataTable, Modal, StatusBadge, KpiStat, Toasts, …
│   ├── layout/      # AppShell, Sidebar, Topbar, RoleSwitcher, guards
│   ├── orders/      # OrderForm, OrderTimeline, BomBreakdown, StatusActions
│   ├── inventory/   # ComponentDetailModal, BomTreeView, PurchaseRequestModal
│   ├── production/  # StationColumn, ProductionCard, ScanModal
│   └── reports/     # ExportPanel
├── pages/           # Login, Dashboard, Orders, OrderDetail, Inventory, Production, Reports, Users
├── hooks/           # useAsync, useDebounce, useProductionBoard, useCountUp, useCan
├── stores/          # auth, ui (Zustand)
├── lib/             # domain (FSM, status meta), rbac, format, cn
├── mock/            # seed, api, socket, rng
└── types/           # domain types
```

## Akun Demo

| Username | Role | Akses |
|----------|------|-------|
| `rangga` | Admin | Penuh — termasuk kelola user |
| `sari` | Supervisor | Order, produksi, adjust stok, export laporan |
| `budi` | Operator | Scan & update produksi di workstation sendiri |
| `maya` | Viewer | Read-only — inventory & laporan |

Password bebas (mode demo). Gunakan tombol **"Lihat sebagai"** di topbar untuk ganti role tanpa logout.
