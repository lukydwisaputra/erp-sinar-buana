"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import { usePenawaranList } from "@/lib/query/penawaran";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" }> = {
  draft: { label: "Draft", variant: "info" },
  terkirim: { label: "Leads - Terkirim", variant: "warning" },
  deal: { label: "Convert - Deal", variant: "success" },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();

  const columns: ColumnDef<Sph>[] = [
    {
      accessorKey: "id", header: "No. SPH", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => router.push(`/penawaran/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-64" } },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
    {
      id: "total", header: "Total Penawaran", meta: { mono: true },
      cell: ({ row }) => formatRupiah(totalPenawaran(row.original.items)),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => { const s = STATUS[row.original.status]; return <Badge variant={s.variant}>{s.label}</Badge>; },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penawaran</h1>
        </div>
        <Button onClick={() => router.push("/penawaran/baru")}><Plus className="size-4" /> Buat SPH</Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="perusahaanNama" searchPlaceholder="Cari perusahaan…" emptyMessage="Belum ada penawaran"
          onEdit={(row) => router.push(`/penawaran/${encodeURIComponent(row.id)}`)}
        />
      )}
    </div>
  );
}
