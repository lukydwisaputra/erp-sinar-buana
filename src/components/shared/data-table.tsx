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
  EllipsisIcon,
  InboxIcon,
  SquarePenIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right";
    mono?: boolean;
    /** Shrink the column to its content width (e.g. a trailing actions column). */
    collapse?: boolean;
    /** Extra classes applied to this column's header + body cells (e.g. a min-width). */
    className?: string;
  }
}

/** Option for the toolbar status (faceted) filter. */
export type DataTableFilterOption = { label: string; value: string };

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column id(s) to wire the text filter input to. Provide multiple to search across ID + name etc. */
  searchColumn?: string;
  searchColumns?: string[];
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
  /**
   * Trailing per-row ⋮ menu (Ubah / Hapus). Shown by default. Provide handlers
   * for real behaviour; without them the actions fire a demo toast (prototype).
   * Set `rowActions={false}` to hide the column entirely.
   */
  rowActions?: boolean;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  /** Extra elements rendered at the right end of the toolbar (e.g. a Filter button). */
  toolbarActions?: React.ReactNode;
  /** Reduce cell vertical padding from py-3 to py-2 for denser rows. */
  compact?: boolean;
  /** Initial sort state. Defaults to [] (unsorted). */
  defaultSorting?: SortingState;
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
  searchColumns,
  searchPlaceholder = "Cari…",
  filterColumn,
  filterPlaceholder = "Semua status",
  filterOptions,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "Tidak ada data.",
  pageSizeOptions = [10, 20, 50],
  initialPageSize = 10,
  rowActions = true,
  onEdit,
  onDelete,
  toolbarActions,
  compact = false,
  defaultSorting = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const searchCols = searchColumns ?? (searchColumn ? [searchColumn] : []);

  const tableColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!rowActions) return columns;
    return [
      ...columns,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "right", collapse: true },
        cell: ({ row }) => (
          <RowActions
            onEdit={onEdit ? () => onEdit(row.original) : undefined}
            onDelete={onDelete ? () => onDelete(row.original) : undefined}
          />
        ),
      },
    ];
  }, [columns, rowActions, onEdit, onDelete]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value) => {
      const q = String(value).toLowerCase();
      return searchCols.some((key) => {
        const v = (row.original as Record<string, unknown>)[key];
        return String(v ?? "").toLowerCase().includes(q);
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
  });

  const colCount = table.getAllColumns().length;

  return (
    <div className="flex w-full flex-col gap-3">
      {(searchCols.length > 0 || (filterColumn && filterOptions) || toolbarActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchCols.length > 0 && (
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
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
          {toolbarActions}
        </div>
      )}

      <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="[&_tr]:border-b-0 bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-muted/50">
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase",
                        meta?.align === "right" && "text-right",
                        meta?.collapse && "w-0",
                        meta?.className
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm uppercase outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
          <TableBody className="border-t border-border">
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
                        <TableCell key={col.id} className={cn("px-4", compact ? "py-2" : "py-3")}>
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
                    const content = flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    );
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "px-4",
                          compact ? "py-2" : "py-3",
                          meta?.align === "right" && "text-right",
                          meta?.mono && "font-mono tabular-nums",
                          meta?.collapse ? "w-0" : "max-w-[360px]",
                          meta?.className
                        )}
                      >
                        {meta?.collapse ? (
                          content
                        ) : (
                          <TruncatingCell align={meta?.align}>{content}</TruncatingCell>
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
      </TooltipProvider>

      {!loading && !error && data.length > 0 && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}

/**
 * Truncates a body cell to its column width with an ellipsis, and reveals the
 * full text in a tooltip *only when* the content actually overflows. Works for
 * any cell content (text, links, badges); tooltip text is read from the
 * rendered DOM (`textContent`). Columns with `meta.collapse` skip this.
 */
function TruncatingCell({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const [text, setText] = React.useState("");

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const over = el.scrollWidth > el.clientWidth + 1;
    setOverflowing((prev) => (prev !== over ? over : prev));
    const t = el.textContent ?? "";
    setText((prev) => (prev !== t ? t : prev));
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Re-check after every render so content changes (filter/sort/paginate) update overflow.
  React.useEffect(() => {
    measure();
  });

  const span = (
    <span ref={ref} className="block max-w-full truncate align-middle">
      {children}
    </span>
  );

  if (!overflowing) return span;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{span}</TooltipTrigger>
      <TooltipContent
        side="top"
        align={align === "right" ? "end" : "start"}
        className="max-w-xs break-words"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/** Trailing ⋮ row menu: Ubah + Hapus (Hapus confirms via alert-dialog). Demo by default. */
function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const handleEdit = onEdit ?? (() => toast("Demo: fitur ubah belum tersedia"));
  const handleDelete = onDelete ?? (() => toast("Demo: data tidak dihapus"));

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Aksi baris">
            <EllipsisIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => handleEdit()}>
            <SquarePenIcon className="mr-2 size-4" /> Ubah
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2Icon className="mr-2 size-4" /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. (Demo: data tidak benar-benar dihapus.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => handleDelete()}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
