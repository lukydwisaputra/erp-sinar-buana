import type { ColumnDef } from "@tanstack/react-table";

/** Leading "#" column shared by every Konfigurasi Sistem list table — numbers
 * rows sequentially in the currently rendered (filtered/paginated) order. */
export function rowNumberColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: "no",
    header: "#",
    enableSorting: false,
    meta: { className: "w-12 text-center" },
    cell: (ctx) => {
      const rows = ctx.table.getRowModel().rows;
      const idx = rows.findIndex((r) => r.id === ctx.row.id);
      const { pageIndex, pageSize } = ctx.table.getState().pagination;
      return <span className="text-muted-foreground">{pageIndex * pageSize + idx + 1}</span>;
    },
  };
}
