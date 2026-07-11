"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { MaskedValue } from "@/components/shared/masked-value";
import { formatRupiah } from "@/lib/format";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const columns: ColumnDef<ArusKasEntry>[] = [
  { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
  { accessorKey: "keterangan", header: "Keterangan", meta: { className: "min-w-40" }, cell: ({ row }) => row.original.keterangan || "—" },
  {
    accessorKey: "kategori", header: "Kategori", meta: { className: "text-center" },
    cell: ({ row }) => <Badge variant="secondary">{row.original.kategori}</Badge>,
  },
  {
    id: "jumlah", header: "Jumlah", meta: { align: "right", mono: true },
    accessorFn: (row) => row.jumlah,
    cell: ({ row }) => (
      <span className={row.original.jenis === "kredit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
        <MaskedValue>{row.original.jenis === "debit" ? "-" : ""}{formatRupiah(row.original.jumlah)}</MaskedValue>
      </span>
    ),
  },
];

interface CashflowTableProps {
  entries: ArusKasEntry[];
  isLoading: boolean;
}

/** FR-09.3 — filterable cashflow table, a lighter read-only summary view (full filter dialog lives on /arus-kas itself). */
export function CashflowTable({ entries, isLoading }: CashflowTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Arus Kas</CardTitle>
        <CardAction className="text-sm text-muted-foreground">Periode terpilih</CardAction>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={entries}
          loading={isLoading}
          searchColumns={["keterangan"]}
          filterColumn="kategori"
          filterOptions={[...new Set(entries.map((e) => e.kategori))].map((k) => ({ label: k, value: k }))}
          searchPlaceholder="Cari keterangan…"
          emptyMessage="Belum ada transaksi pada periode ini"
          defaultSorting={[{ id: "tanggal", desc: true }]}
          rowActions={false}
          compact
        />
      </CardContent>
    </Card>
  );
}
