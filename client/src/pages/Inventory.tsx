import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Boxes, Cpu, FileSpreadsheet, Layers, PackageSearch } from "lucide-react";
import { num, rupiah, rupiahShort } from "@/lib/format";
import { cn } from "@/lib/cn";
import { api, type ComponentRow } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useDebounce } from "@/hooks/useDebounce";
import { useCan } from "@/hooks/useCan";
import { Panel } from "@/components/common/Panel";
import { KpiStat } from "@/components/common/KpiStat";
import { DataTable, type SortState } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { Segmented } from "@/components/common/Tabs";
import { Select } from "@/components/common/Form";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/StatusBadge";
import { StatusLED } from "@/components/common/StatusLED";
import { Skeleton } from "@/components/common/feedback";
import { ComponentDetailModal } from "@/components/inventory/ComponentDetailModal";
import { BomTreeView } from "@/components/inventory/BomTreeView";
import { PurchaseRequestModal } from "@/components/inventory/PurchaseRequestModal";

type Tab = "components" | "boms" | "alerts";

export function Inventory() {
  const [tab, setTab] = useState<Tab>("components");
  const { data: summary } = useAsync(() => api.inventory.summary(), []);

  return (
    <div className="space-y-5">
      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary ? (
          <>
            <KpiStat label="Total Komponen" value={summary.total} icon={<Boxes className="h-4 w-4" />} accent="copper" />
            <KpiStat label="Low Stock" value={summary.lowStock} unit="item" icon={<AlertTriangle className="h-4 w-4" />} accent="bad" />
            <KpiStat label="Nilai Inventory" value={summary.totalValue} format={rupiahShort} icon={<FileSpreadsheet className="h-4 w-4" />} accent="signal" />
            <KpiStat label="Kategori" value={summary.categories} icon={<Layers className="h-4 w-4" />} accent="warn" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[116px]" />)
        )}
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "components", label: "Komponen" },
          { value: "boms", label: "BOM Library" },
          { value: "alerts", label: "Low Stock", count: summary?.lowStock },
        ]}
      />

      {tab === "components" && <ComponentsTab />}
      {tab === "boms" && <BomsTab />}
      {tab === "alerts" && <AlertsTab />}
    </div>
  );
}

// ── components tab ────────────────────────────────────────────
function ComponentsTab() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ id: "partNumber", desc: false });
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounce(search, 300);

  const { data: categories } = useAsync(() => api.inventory.categories(), []);
  const { data, loading, refetch } = useAsync(
    () =>
      api.inventory.list({
        search: debounced,
        category: category ? [category] : undefined,
        page,
        pageSize: 12,
        sortBy: sort.id,
        sortDir: sort.desc ? "desc" : "asc",
      }),
    [debounced, category, page, sort.id, sort.desc],
  );

  const columns = useMemo<ColumnDef<ComponentRow, unknown>[]>(
    () => [
      {
        id: "partNumber",
        accessorKey: "partNumber",
        header: "Part Number",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <StatusLED tone={row.original.low ? "bad" : "ok"} />
            <div>
              <p className="data font-semibold text-ink">{row.original.partNumber}</p>
              <p className="truncate text-2xs text-ink-faint">{row.original.description}</p>
            </div>
          </div>
        ),
      },
      { id: "category", accessorKey: "category", header: "Kategori", enableSorting: true, cell: ({ getValue }) => <Badge tone="neutral">{getValue() as string}</Badge> },
      { id: "location", accessorKey: "location", header: "Bin", cell: ({ getValue }) => <span className="data text-2xs text-ink-dim">{getValue() as string}</span> },
      {
        id: "available",
        accessorKey: "available",
        header: "Tersedia",
        enableSorting: true,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="text-right">
            <span className={cn("data font-semibold", row.original.low ? "text-bad" : "text-ink")}>{num(row.original.available)}</span>
            <p className="text-2xs text-ink-faint">stok {num(row.original.stockQty)}</p>
          </div>
        ),
      },
      { id: "minStock", accessorKey: "minStock", header: "Min", enableSorting: true, meta: { align: "right" }, cell: ({ getValue }) => <span className="data text-ink-dim">{num(getValue() as number)}</span> },
      { id: "unitCost", accessorKey: "unitCost", header: "Harga", enableSorting: true, meta: { align: "right" }, cell: ({ getValue }) => <span className="data text-ink-dim">{rupiah(getValue() as number)}</span> },
      { id: "supplierName", accessorKey: "supplierName", header: "Supplier", enableSorting: true, cell: ({ getValue }) => <span className="text-xs text-ink-dim">{getValue() as string}</span> },
    ],
    [],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Cari part number / deskripsi…"
          className="w-56 sm:w-72"
        />
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="w-44"
          options={[{ value: "", label: "Semua kategori" }, ...(categories ?? []).map((c) => ({ value: c, label: c }))]}
        />
      </div>

      <Panel className="mt-4" pad={false} icon={<Cpu className="h-4 w-4" />} title="Daftar Komponen" subtitle={data ? `${data.total} komponen` : undefined}>
        <DataTable<ComponentRow>
          columns={columns}
          data={data?.items ?? []}
          loading={loading}
          total={data?.total ?? 0}
          page={page}
          pageSize={12}
          onPageChange={setPage}
          sort={sort}
          onSortChange={(s) => {
            setSort(s);
            setPage(1);
          }}
          onRowClick={(row) => setSelected(row.id)}
          getRowId={(row) => row.id}
          emptyIcon={<PackageSearch className="h-5 w-5" />}
          emptyTitle="Komponen tidak ditemukan"
        />
      </Panel>

      <ComponentDetailModal componentId={selected} onClose={() => setSelected(null)} onChanged={refetch} />
    </>
  );
}

// ── boms tab ──────────────────────────────────────────────────
function BomsTab() {
  const { data: boms } = useAsync(() => api.boms.list(), []);
  const { data: all } = useAsync(() => api.inventory.list({ pageSize: 999 }), []);
  const map = useMemo(() => new Map((all?.items ?? []).map((c) => [c.id, c])), [all]);

  if (!boms || !all) return <Skeleton className="mt-4 h-96" />;

  return (
    <Panel className="mt-4" title="BOM Library" subtitle={`${boms.length} desain PCB · expand untuk lihat komponen`} icon={<Layers className="h-4 w-4" />}>
      <BomTreeView boms={boms} componentMap={map} />
    </Panel>
  );
}

// ── alerts tab ────────────────────────────────────────────────
function AlertsTab() {
  const can = useCan();
  const { data } = useAsync(() => api.inventory.alerts(), []);
  const [prOpen, setPrOpen] = useState(false);

  return (
    <Panel
      className="mt-4"
      pad={false}
      icon={<AlertTriangle className="h-4 w-4" />}
      title="Komponen Low Stock"
      subtitle={data ? `${data.rows.length} di bawah minimum` : undefined}
      action={
        can("inventory.adjust") && (
          <Button variant="primary" size="sm" disabled={!data?.rows.length} onClick={() => setPrOpen(true)}>
            Generate Purchase Request
          </Button>
        )
      }
    >
      {!data ? (
        <div className="p-4">
          <Skeleton className="h-64" />
        </div>
      ) : data.rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-dim">Semua stok aman 🎉</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="label px-4 py-2.5 text-left">Part Number</th>
                <th className="label px-4 py-2.5 text-left">Supplier</th>
                <th className="label px-4 py-2.5 text-right">Tersedia</th>
                <th className="label px-4 py-2.5 text-right">Min</th>
                <th className="label px-4 py-2.5 text-right">Lead</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <StatusLED tone={c.available <= 0 ? "bad" : "hold"} pulse={c.available <= 0} />
                      <div>
                        <p className="data text-xs font-semibold text-ink">{c.partNumber}</p>
                        <p className="truncate text-2xs text-ink-faint">{c.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-dim">{c.supplierName}</td>
                  <td className="data px-4 py-2.5 text-right font-semibold text-bad">{num(c.available)}</td>
                  <td className="data px-4 py-2.5 text-right text-ink-dim">{num(c.minStock)}</td>
                  <td className="data px-4 py-2.5 text-right text-ink-faint">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PurchaseRequestModal open={prOpen} onClose={() => setPrOpen(false)} lines={data?.purchaseRequest ?? []} />
    </Panel>
  );
}
