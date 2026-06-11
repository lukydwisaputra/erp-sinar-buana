"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderKanban } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { formatRupiahCompact } from "@/lib/format";
import { useProyekList } from "@/lib/query/proyek";
import type { Proyek, ProyekStatus } from "@/lib/schemas/proyek";

const STATUS: Record<ProyekStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  po_kontrak:        { label: "PO/Kontrak",         variant: "info" },
  collecting_data:   { label: "Pengumpulan Data",    variant: "info" },
  drafting:          { label: "Penyusunan",          variant: "warning" },
  tunggu_pengesahan: { label: "Tunggu Pengesahan",   variant: "warning" },
  pending:           { label: "Pending",             variant: "secondary" },
  selesai:           { label: "Selesai",             variant: "success" },
  batal:             { label: "Batal",               variant: "destructive" },
};

function ProyekStatusBadge({ status }: { status: ProyekStatus }) {
  const s = STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function ProyekPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProyekList();

  const columns: ColumnDef<Proyek>[] = [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/proyek/${row.original.id}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama Proyek", meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/proyek/${row.original.id}`)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-40" } },
    {
      accessorKey: "layananNama", header: "Layanan",
      cell: ({ row }) => {
        const names = row.original.layananNama;
        return (
          <div className="flex flex-wrap gap-1">
            {names.slice(0, 2).map((n) => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
            {names.length > 2 && <Badge variant="secondary" className="text-xs">+{names.length - 2}</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => <ProyekStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "nilaiKontrak", header: "Nilai Kontrak",
      meta: { align: "right", mono: true },
      cell: ({ row }) => formatRupiahCompact(row.original.nilaiKontrak),
    },
    { accessorKey: "tahun", header: "Tahun", meta: { mono: true } },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderKanban className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Proyek</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="nama"
          searchPlaceholder="Cari nama proyek…"
          emptyMessage="Belum ada proyek"
          rowActions={false}
        />
      )}
    </div>
  );
}
