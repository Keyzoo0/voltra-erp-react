import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Plus } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { fmtDate, dueLabel, num, rupiahShort } from "@/lib/format";
import { api, type OrderListParams, type OrderRow } from "@/mock/api";
import { useAsync } from "@/hooks/useAsync";
import { useDebounce } from "@/hooks/useDebounce";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/common/Panel";
import { DataTable, type SortState } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { Segmented } from "@/components/common/Tabs";
import { Button } from "@/components/common/Button";
import { OrderStatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { OrderForm } from "@/components/orders/OrderForm";

type Scope = "all" | "active" | "hold" | "done";
const SCOPE_PARAMS: Record<Scope, OrderListParams> = {
  all: {},
  active: { activeOnly: true },
  hold: { status: ["ON_HOLD", "QC_FAIL"] },
  done: { status: ["COMPLETED", "SHIPPED"] },
};

export function Orders() {
  const navigate = useNavigate();
  const can = useCan();
  const [params, setParams] = useSearchParams();

  const [scope, setScope] = useState<Scope>("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ id: "createdAt", desc: true });
  const [formOpen, setFormOpen] = useState(false);
  const debounced = useDebounce(search, 300);

  // open form from ?new=1 (e.g. Dashboard CTA)
  useEffect(() => {
    if (params.get("new") === "1") {
      setFormOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const { data, loading, refetch } = useAsync(
    () =>
      api.orders.list({
        ...SCOPE_PARAMS[scope],
        search: debounced,
        page,
        pageSize: 10,
        sortBy: sort.id,
        sortDir: sort.desc ? "desc" : "asc",
      }),
    [scope, debounced, page, sort.id, sort.desc],
  );

  const columns = useMemo<ColumnDef<OrderRow, unknown>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: "PO Code",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <p className="data font-semibold text-ink">{row.original.code}</p>
            <p className="text-2xs text-ink-faint">{fmtDate(row.original.createdAt)}</p>
          </div>
        ),
      },
      {
        id: "client",
        accessorKey: "client",
        header: "Client",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-ink">{row.original.client}</p>
            <p className="text-2xs text-ink-faint">oleh {row.original.createdByName}</p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => <OrderStatusBadge status={getValue() as OrderStatus} />,
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: "Prioritas",
        enableSorting: true,
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: "totalUnits",
        accessorKey: "totalUnits",
        header: "Unit",
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="data text-ink">{num(getValue() as number)}</span>,
      },
      {
        id: "totalCost",
        accessorKey: "totalCost",
        header: "Nilai",
        enableSorting: true,
        meta: { align: "right" },
        cell: ({ getValue }) => <span className="data text-ink">{rupiahShort(getValue() as number)}</span>,
      },
      {
        id: "dueDate",
        accessorKey: "dueDate",
        header: "Due",
        enableSorting: true,
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const due = dueLabel(getValue() as string);
          return (
            <div className="text-right">
              <p className="text-ink">{fmtDate(getValue() as string)}</p>
              <p className={cn("text-2xs font-semibold", due.overdue ? "text-bad" : due.soon ? "text-warn" : "text-ink-faint")}>
                {due.text}
              </p>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Scope>
          value={scope}
          onChange={(v) => {
            setScope(v);
            setPage(1);
          }}
          items={[
            { value: "active", label: "Aktif" },
            { value: "all", label: "Semua" },
            { value: "hold", label: "Perlu Perhatian" },
            { value: "done", label: "Selesai" },
          ]}
        />
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari PO / client…"
            className="w-48 sm:w-60"
          />
          {can("order.create") && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
              <span className="hidden sm:inline">Buat Order</span>
            </Button>
          )}
        </div>
      </div>

      <Panel pad={false} icon={<ClipboardList className="h-4 w-4" />} title="Daftar Order" subtitle={data ? `${data.total} order` : undefined}>
        <DataTable<OrderRow>
          columns={columns}
          data={data?.items ?? []}
          loading={loading}
          total={data?.total ?? 0}
          page={page}
          pageSize={10}
          onPageChange={setPage}
          sort={sort}
          onSortChange={(s) => {
            setSort(s);
            setPage(1);
          }}
          onRowClick={(row) => navigate(`/orders/${row.id}`)}
          getRowId={(row) => row.id}
          emptyTitle="Belum ada order"
          emptyDescription="Tidak ada order yang cocok dengan filter ini."
        />
      </Panel>

      <OrderForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={(o: Order) => { refetch(); navigate(`/orders/${o.id}`); }} />
    </div>
  );
}
