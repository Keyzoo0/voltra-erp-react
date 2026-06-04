import { type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState, Skeleton } from "./feedback";

// allow per-column alignment / classes via column meta
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right" | "center";
    className?: string;
    headerClassName?: string;
  }
}

export interface SortState {
  id: string;
  desc: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  data,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  sort,
  onSortChange,
  onRowClick,
  getRowId,
  emptyTitle = "Tidak ada data",
  emptyDescription,
  emptyIcon = <Inbox className="h-5 w-5" />,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualSorting: true,
    manualPagination: true,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const handleSort = (id: string, canSort: boolean) => {
    if (!canSort || !onSortChange) return;
    onSortChange({ id, desc: sort?.id === id ? !sort.desc : false });
  };

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const meta = header.column.columnDef.meta;
                  const active = sort?.id === header.column.id;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "label whitespace-nowrap bg-surface px-4 py-2.5",
                        alignClass[meta?.align ?? "left"],
                        meta?.headerClassName,
                      )}
                    >
                      <button
                        type="button"
                        disabled={!canSort}
                        onClick={() => handleSort(header.column.id, canSort)}
                        className={cn(
                          "inline-flex items-center gap-1",
                          meta?.align === "right" && "flex-row-reverse",
                          canSort && "transition-colors hover:text-ink",
                          active && "text-copper",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (active ? (
                            sort!.desc ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          ))}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: pageSize > 8 ? 8 : pageSize }).map((_, i) => (
                  <tr key={i} className="border-b border-line/60">
                    {columns.map((_c, ci) => (
                      <td key={ci} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "group border-b border-line/60 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-surface-2/70",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn("px-4 py-3 align-middle text-ink-dim", alignClass[meta?.align ?? "left"], meta?.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!loading && data.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      )}

      <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs text-ink-dim">
        <span className="data">
          {from}–{to} <span className="text-ink-faint">dari</span> {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-press inline-flex h-8 items-center gap-1 rounded-md border border-line px-2 hover:border-line-strong disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="data px-2 text-ink-faint">
            {page} / {pageCount}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className="btn-press inline-flex h-8 items-center gap-1 rounded-md border border-line px-2 hover:border-line-strong disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
