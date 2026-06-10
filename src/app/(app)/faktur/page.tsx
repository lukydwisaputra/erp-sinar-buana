"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { computeFaktur, isFakturOverdue } from "@/lib/faktur";
import { useFakturList } from "@/lib/query/faktur";
import type { Faktur } from "@/lib/schemas/faktur";

function tanggalID(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

const STATUS: Record<Faktur["status"], { label: string; variant: "info" | "warning" | "success" }> = {
  draft: { label: "Draft", variant: "info" },
  terkirim: { label: "Terkirim", variant: "warning" },
  lunas: { label: "Lunas", variant: "success" },
};

export default function FakturPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useFakturList();

  const columns: ColumnDef<Faktur>[] = [
    {
      accessorKey: "id", header: "No. Faktur", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => router.push(`/faktur/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-64" } },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
    { accessorKey: "jatuhTempo", header: "Jatuh Tempo", cell: ({ row }) => tanggalID(row.original.jatuhTempo) },
    {
      id: "total", header: "Total Tagihan", meta: { mono: true },
      cell: ({ row }) => formatRupiah(computeFaktur(row.original).total),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => {
        if (isFakturOverdue(row.original)) return <Badge variant="destructive">Jatuh Tempo</Badge>;
        const s = STATUS[row.original.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Faktur</h1>
        </div>
        <Button onClick={() => router.push("/faktur/baru")}><Plus className="size-4" /> Buat Faktur</Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="perusahaanNama" searchPlaceholder="Cari perusahaan…" emptyMessage="Belum ada faktur"
          onEdit={(row) => router.push(`/faktur/${encodeURIComponent(row.id)}`)} />
      )}
    </div>
  );
}
