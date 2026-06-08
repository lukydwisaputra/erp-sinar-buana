"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Table as TanstackTable,
  type RowData,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  InboxIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right";
    mono?: boolean;
  }
}

/** Option for the toolbar status (faceted) filter. */
export type DataTableFilterOption = { label: string; value: string };

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column id to wire the text filter input to. */
  searchColumn?: string;
  searchPlaceholder?: string;
  /** Column id to wire the status <Select> to (+ its options). */
  filterColumn?: string;
  filterPlaceholder?: string;
  filterOptions?: DataTableFilterOption[];
  /** Display states. `loading` shows skeleton rows; `error` shows a retry panel. */
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Page sizes offered by the pagination footer. Default [5, 10, 20]. */
  pageSizeOptions?: number[];
  initialPageSize?: number;
};

/**
 * Generic, reusable TanStack-Table wrapper for the ERP.
 *
 * Features: sortable caption-case headers (muted, with sort affordance),
 * a toolbar (text filter + status <Select>), client-side pagination
 * (page nav + page-size select), hairline row borders, hover `bg-muted/50`,
 * and loading / empty / error display states.
 *
 * Right-align + mono an amount column from the *column def* via
 * `meta: { align: "right", mono: true }` — kept generic so Phase-2 screens
 * (invoices, payments, etc.) can reuse it directly.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Cari…",
  filterColumn,
  filterPlaceholder = "Semua status",
  filterOptions,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "Tidak ada data.",
  pageSizeOptions = [5, 10, 20],
  initialPageSize = 5,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
  });

  const colCount = table.getAllColumns().length;

  return (
    <div className="flex w-full flex-col gap-3">
      {(searchColumn || (filterColumn && filterOptions)) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchColumn && (
            <Input
              value={
                (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
              }
              onChange={(e) =>
                table.getColumn(searchColumn)?.setFilterValue(e.target.value)
              }
              placeholder={searchPlaceholder}
              className="h-9 w-84"
            />
          )}
          {filterColumn && filterOptions && (
            <Select
              value={
                (table.getColumn(filterColumn)?.getFilterValue() as string) ??
                "__all__"
              }
              onValueChange={(v) =>
                table
                  .getColumn(filterColumn)
                  ?.setFilterValue(v === "__all__" ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder={filterPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{filterPlaceholder}</SelectItem>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                        meta?.align === "right" && "text-right"
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            meta?.align === "right" && "flex-row-reverse"
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3.5" />
                          ) : (
                            <ChevronsUpDownIcon className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="h-40">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <TriangleAlertIcon className="size-6 text-destructive" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Coba lagi
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : loading ? (
              Array.from({ length: table.getState().pagination.pageSize }).map(
                (_, r) => (
                  <TableRow key={r} className="hover:bg-transparent">
                    {table.getVisibleLeafColumns().map((col) => {
                      const meta = col.columnDef.meta;
                      return (
                        <TableCell key={col.id} className="py-3">
                          <Skeleton
                            className={cn(
                              "h-4 w-24",
                              meta?.align === "right" && "ml-auto"
                            )}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )
              )
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colCount}
                  className="h-40 text-center text-sm text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <InboxIcon className="size-6 opacity-60" />
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-3",
                          meta?.align === "right" && "text-right",
                          meta?.mono && "font-mono tabular-nums"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && !error && data.length > 0 && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions,
}: {
  table: TanstackTable<TData>;
  pageSizeOptions: number[];
}) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const rowCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Baris per halaman</span>
        <Select
          value={String(table.getState().pagination.pageSize)}
          onValueChange={(v) => table.setPageSize(Number(v))}
        >
          <SelectTrigger className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-2 tabular-nums">{rowCount} baris</span>
      </div>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text="Sebelumnya"
              href="#"
              aria-disabled={!table.getCanPreviousPage()}
              className={cn(
                !table.getCanPreviousPage() &&
                  "pointer-events-none opacity-50"
              )}
              onClick={(e) => {
                e.preventDefault();
                table.previousPage();
              }}
            />
          </PaginationItem>
          {Array.from({ length: pageCount }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={i === pageIndex}
                onClick={(e) => {
                  e.preventDefault();
                  table.setPageIndex(i);
                }}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              text="Berikutnya"
              href="#"
              aria-disabled={!table.getCanNextPage()}
              className={cn(
                !table.getCanNextPage() && "pointer-events-none opacity-50"
              )}
              onClick={(e) => {
                e.preventDefault();
                table.nextPage();
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
